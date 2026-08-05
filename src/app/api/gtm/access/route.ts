import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ensureAppUser } from '@/lib/gtm/database';
import { getServiceSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = new Set(['active', 'trialing']);

type AccessOutcome =
  | 'authorized'
  | 'unauthorized'
  | 'clerk_error'
  | 'supabase_error';

async function mirrorClerkUser(userId: string) {
  const clerkUser = await currentUser();
  await ensureAppUser(userId, {
    email: clerkUser?.primaryEmailAddress?.emailAddress,
    displayName: clerkUser?.fullName,
    avatarUrl: clerkUser?.imageUrl,
  });
}

function timingHeaders(
  clerkAuthMs: number,
  supabaseQueryMs: number,
  totalMs: number
) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Server-Timing': [
      `clerk-auth;dur=${clerkAuthMs}`,
      `supabase-query;dur=${supabaseQueryMs}`,
      `total;dur=${totalMs}`,
    ].join(', '),
  };
}

function logTiming(input: {
  outcome: AccessOutcome;
  startedAt: number;
  clerkAuthMs: number;
  supabaseQueryMs: number;
  error?: unknown;
}) {
  const totalMs = Date.now() - input.startedAt;
  const payload = {
    route: '/api/gtm/access',
    outcome: input.outcome,
    clerkAuthMs: input.clerkAuthMs,
    supabaseQueryMs: input.supabaseQueryMs,
    totalMs,
    ...(input.error
      ? {
          error:
            input.error instanceof Error
              ? input.error.message
              : String(input.error),
        }
      : {}),
  };
  const serialized = JSON.stringify(payload);
  if (input.error) console.error('[gtm/access]', serialized);
  else console.info('[gtm/access]', serialized);
  return totalMs;
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const clerkStartedAt = Date.now();
  let clerkAuthMs = 0;
  let supabaseQueryMs = 0;
  let userId: string | null = null;

  try {
    ({ userId } = await auth());
    clerkAuthMs = Date.now() - clerkStartedAt;
  } catch (error) {
    clerkAuthMs = Date.now() - clerkStartedAt;
    const totalMs = logTiming({
      outcome: 'clerk_error',
      startedAt,
      clerkAuthMs,
      supabaseQueryMs,
      error,
    });
    return NextResponse.json(
      { error: 'Failed to authenticate subscription access' },
      {
        status: 500,
        headers: timingHeaders(clerkAuthMs, supabaseQueryMs, totalMs),
      }
    );
  }

  if (!userId) {
    const totalMs = logTiming({
      outcome: 'unauthorized',
      startedAt,
      clerkAuthMs,
      supabaseQueryMs,
    });
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: timingHeaders(clerkAuthMs, supabaseQueryMs, totalMs),
      }
    );
  }

  try {
    // Mirror Clerk → app_users on every authenticated visit (including free tier).
    // Failures must not block the entitlement check; /api/gtm/state also ensures
    // the row when remote hydration runs.
    try {
      await mirrorClerkUser(userId);
    } catch (mirrorError) {
      console.error('[gtm/access] Failed to mirror Clerk user', mirrorError);
    }

    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (sessionId) {
      if (!/^cs_(test_|live_)[A-Za-z0-9]+$/.test(sessionId)) {
        return NextResponse.json(
          { error: 'Invalid Checkout Session' },
          { status: 400 }
        );
      }
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });
      const sessionUserId =
        session.client_reference_id ?? session.metadata?.clerk_user_id;
      if (sessionUserId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const subscription =
        typeof session.subscription === 'string'
          ? await getStripe().subscriptions.retrieve(session.subscription)
          : session.subscription;
      const checkoutPaid =
        session.status === 'complete' &&
        (session.payment_status === 'paid' ||
          session.payment_status === 'no_payment_required') &&
        Boolean(subscription && PAID_STATUSES.has(subscription.status));
      if (checkoutPaid && subscription) {
        const period = subscription.current_period_end;
        const { error: syncError } = await getServiceSupabase()
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id:
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer?.id,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id ?? null,
              plan: session.metadata?.plan ?? 'pro',
              billing_cycle: session.metadata?.billing_cycle ?? null,
              status: subscription.status,
              current_period_end: period
                ? new Date(period * 1000).toISOString()
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
            { onConflict: 'user_id' }
          );
        if (syncError) throw syncError;
        const totalMs = logTiming({
          outcome: 'authorized',
          startedAt,
          clerkAuthMs,
          supabaseQueryMs,
        });
        return NextResponse.json(
          { paid: true, verifiedBy: 'checkout_session' },
          {
            headers: timingHeaders(clerkAuthMs, supabaseQueryMs, totalMs),
          }
        );
      }
    }

    const supabaseStartedAt = Date.now();
    const { data, error } = await getServiceSupabase()
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    supabaseQueryMs = Date.now() - supabaseStartedAt;

    if (error) throw error;

    const totalMs = logTiming({
      outcome: 'authorized',
      startedAt,
      clerkAuthMs,
      supabaseQueryMs,
    });

    return NextResponse.json(
      { paid: PAID_STATUSES.has(data?.status ?? '') },
      {
        headers: timingHeaders(clerkAuthMs, supabaseQueryMs, totalMs),
      }
    );
  } catch (error) {
    const totalMs = logTiming({
      outcome: 'supabase_error',
      startedAt,
      clerkAuthMs,
      supabaseQueryMs,
      error,
    });
    return NextResponse.json(
      { error: 'Failed to check subscription access' },
      {
        status: 500,
        headers: timingHeaders(clerkAuthMs, supabaseQueryMs, totalMs),
      }
    );
  }
}

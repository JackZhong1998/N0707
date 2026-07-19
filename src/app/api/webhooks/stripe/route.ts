import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { ensureAppUser } from '@/lib/gtm/database';
import { getStripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function timestamp(value: number | null | undefined): string | null {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  eventCreated: number,
  fallbackClerkUserId?: string
) {
  const supabase = getServiceSupabase();
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const { data: existing, error: existingError } = await supabase
    .from('subscriptions')
    .select('user_id, stripe_event_created_at')
    .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
    .maybeSingle();
  if (existingError) throw existingError;

  // Stripe doesn't guarantee delivery order. Never let an older event roll a
  // subscription back after a newer status has already been persisted.
  if (
    existing?.stripe_event_created_at &&
    Date.parse(existing.stripe_event_created_at) > eventCreated * 1000
  ) {
    return;
  }

  const clerkUserId =
    subscription.metadata.clerk_user_id ||
    subscription.metadata.userId ||
    fallbackClerkUserId ||
    existing?.user_id;
  if (!clerkUserId) {
    throw new Error(`No Clerk user mapping for Stripe subscription ${subscription.id}`);
  }

  await ensureAppUser(clerkUserId);
  const price = subscription.items.data[0]?.price;
  const plan = subscription.metadata.plan || (price?.id ? 'pro' : 'free');
  const billingCycle =
    subscription.metadata.billing_cycle || price?.recurring?.interval || null;
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: clerkUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price?.id ?? null,
      plan,
      billing_cycle: billingCycle,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: timestamp(subscription.current_period_start),
      current_period_end: timestamp(subscription.current_period_end),
      canceled_at: timestamp(subscription.canceled_at),
      stripe_event_created_at: timestamp(eventCreated),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

async function beginEvent(event: Stripe.Event): Promise<'process' | 'duplicate'> {
  const supabase = getServiceSupabase();
  const object = event.data.object as { id?: string };
  const { error } = await supabase.from('stripe_events').insert({
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    object_id: object.id ?? null,
    status: 'processing',
    stripe_created_at: new Date(event.created * 1000).toISOString(),
  });
  if (!error) return 'process';
  if (error.code !== '23505') throw error;

  const { data, error: selectError } = await supabase
    .from('stripe_events')
    .select('status')
    .eq('id', event.id)
    .single();
  if (selectError) throw selectError;
  if (data.status !== 'failed') return 'duplicate';

  const { error: retryError } = await supabase
    .from('stripe_events')
    .update({ status: 'processing', error: null })
    .eq('id', event.id);
  if (retryError) throw retryError;
  return 'process';
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing Stripe signature configuration' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    if ((await beginEvent(event)) === 'duplicate') {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(
            subscription,
            event.created,
            session.metadata?.clerk_user_id ?? session.client_reference_id ?? undefined
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription, event.created);
        break;
      default:
        break;
    }

    const { error } = await supabase
      .from('stripe_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), error: null })
      .eq('id', event.id);
    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    await supabase
      .from('stripe_events')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error',
      })
      .eq('id', event.id);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe, PLANS } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';
import { ensureAppUser } from '@/lib/gtm/database';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripe();
    const supabase = getServiceSupabase();

    const { plan, billingCycle, locale } = await request.json();

    if (plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
    }

    const priceId = billingCycle === 'yearly'
      ? PLANS.pro.yearlyPriceId
      : PLANS.pro.monthlyPriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    await ensureAppUser(userId, {
      email,
      displayName: clerkUser?.fullName,
      avatarUrl: clerkUser?.imageUrl,
    });

    const { data: existing, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', userId)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (existing && ['active', 'trialing'].includes(existing.status)) {
      return NextResponse.json({ error: 'Subscription already active' }, { status: 409 });
    }

    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: clerkUser?.fullName ?? undefined,
        metadata: { clerk_user_id: userId },
      });
      customerId = customer.id;
      const { error } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'inactive',
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const safeLocale = locale === 'zh' ? 'zh' : 'en';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/${safeLocale}/app/calendar?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${safeLocale}/pricing?canceled=true`,
      metadata: { clerk_user_id: userId, plan, billing_cycle: billingCycle },
      subscription_data: {
        metadata: { clerk_user_id: userId, plan, billing_cycle: billingCycle },
      },
      client_reference_id: userId,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

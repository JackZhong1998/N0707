import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      appInfo: { name: 'NowBuild', version: '0.1.0' },
    });
  }
  return stripeClient;
}

export const PLANS = {
  free: {
    name: 'Free',
    monthlyPriceId: null,
    yearlyPriceId: null,
  },
  pro: {
    name: 'Pro',
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ?? '',
  },
} as const;

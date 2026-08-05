import { localePath } from '@/lib/seo';

export type CheckoutBody = {
  plan?: 'pro';
  billingCycle?: 'monthly' | 'yearly';
  locale: string;
};

/** Public pricing URL that auto-starts Stripe Checkout after auth. */
export function pricingCheckoutReturnPath(locale: string) {
  return `${localePath(locale, '/pricing')}?checkout=1`;
}

export function signInUrlForCheckout(locale: string, origin: string) {
  const signInPath = localePath(locale, '/sign-in');
  const returnPath = pricingCheckoutReturnPath(locale);
  const redirectUrl = new URL(returnPath, origin).toString();
  return `${signInPath}?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

export async function createCheckoutSessionUrl(body: CheckoutBody): Promise<string> {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: body.plan ?? 'pro',
      billingCycle: body.billingCycle ?? 'monthly',
      locale: body.locale,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (response.status === 401) {
    const err = new Error('Unauthorized');
    (err as Error & { code?: string }).code = 'unauthorized';
    throw err;
  }
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || 'Checkout failed');
  }
  return payload.url;
}

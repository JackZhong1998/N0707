'use client';

import { useSearchParams } from 'next/navigation';
import StartCheckoutButton from '@/components/pricing/StartCheckoutButton';

/** Pricing-page CTA that resumes Stripe Checkout after sign-in via `?checkout=1`. */
export default function PricingCheckoutButton({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('checkout') === '1';

  return <StartCheckoutButton autoStart={autoStart} className={className} />;
}

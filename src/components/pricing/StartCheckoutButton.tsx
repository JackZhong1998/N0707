'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import {
  createCheckoutSessionUrl,
  signInUrlForCheckout,
} from '@/lib/stripe/checkout';

type Props = {
  className?: string;
  /** When true, start Stripe Checkout as soon as the user is signed in. */
  autoStart?: boolean;
  label?: string;
  loadingLabel?: string;
};

export default function StartCheckoutButton({
  className,
  autoStart = false,
  label,
  loadingLabel,
}: Props) {
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const autoStarted = useRef(false);

  const resolvedLabel = label ?? (isZh ? '组建我的推广团队' : 'Build My Launch Team');
  const resolvedLoading =
    loadingLabel ?? (isZh ? '正在前往安全支付页…' : 'Opening secure checkout…');

  async function startCheckout() {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      if (!isLoaded) {
        setLoading(false);
        return;
      }

      if (!isSignedIn) {
        window.location.assign(signInUrlForCheckout(locale, window.location.origin));
        return;
      }

      const url = await createCheckoutSessionUrl({ locale });
      window.location.assign(url);
    } catch (checkoutError) {
      const code = (checkoutError as Error & { code?: string }).code;
      if (code === 'unauthorized') {
        window.location.assign(signInUrlForCheckout(locale, window.location.origin));
        return;
      }
      setLoading(false);
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : isZh
            ? '暂时无法打开支付页'
            : 'Unable to open checkout'
      );
    }
  }

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    if (!isLoaded || !isSignedIn) return;
    autoStarted.current = true;
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when auth is ready
  }, [autoStart, isLoaded, isSignedIn]);

  return (
    <div>
      <button
        type="button"
        disabled={loading || !isLoaded}
        onClick={() => void startCheckout()}
        className={className}
      >
        {loading || !isLoaded ? resolvedLoading : resolvedLabel}
      </button>
      {error ? <p className="mt-3 text-center text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

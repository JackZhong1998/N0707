'use client';

import { useLocale, useTranslations } from 'next-intl';

type PricingModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const t = useTranslations('Pricing');
  const locale = useLocale();

  if (!isOpen) return null;

  const plans = ['free', 'pro'] as const;

  async function handleSubscribe(plan: string) {
    if (plan === 'free') {
      onClose();
      window.location.href = `/${locale}/sign-up`;
      return;
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle: 'monthly', locale }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            {t('title')}
          </h2>
          <p className="mt-2 text-gray-500">{t('subtitle')}</p>

          <p className="mt-4 text-sm text-gray-500">
            {locale === 'zh' ? '按月订阅，随时可以取消；只使用一个月也完全可以。' : 'Monthly, cancel anytime, and one month is fine.'}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((planKey) => {
            const isPro = planKey === 'pro';
            const price = t(`plans.${planKey}.priceMonthly`);
            const period = t('perMonth');

            const features: string[] = [];
            let i = 0;
            while (true) {
              try {
                const feature = t(`plans.${planKey}.features.${i}`);
                if (!feature) break;
                features.push(feature);
                i++;
              } catch {
                break;
              }
            }

            return (
              <div
                key={planKey}
                className={`relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg ${
                  isPro
                    ? 'border-primary-200 bg-primary-50/30 shadow-md ring-2 ring-primary-600'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                    {t('mostPopular')}
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-display text-lg font-bold text-gray-900">
                    {t(`plans.${planKey}.name`)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t(`plans.${planKey}.description`)}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="font-display text-3xl font-bold text-gray-900">{price}</span>
                  <span className="text-sm text-gray-500">{period}</span>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(planKey)}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    isPro
                      ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {planKey === 'free' ? t('getStarted') : t('subscribe')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

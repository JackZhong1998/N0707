'use client';

import { useTranslations } from 'next-intl';

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function Qualifier() {
  const t = useTranslations('Qualifier');

  const fitItems = Array.from({ length: 4 }, (_, i) => t(`fit.${i}`));
  const notFitItems = Array.from({ length: 4 }, (_, i) => t(`notFit.${i}`));

  return (
    <section id="qualifier" className="bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
          {/* Fit */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h3 className="font-display text-lg font-bold text-emerald-700">
              {t('fitTitle')}
            </h3>
            <ul className="mt-5 space-y-4">
              {fitItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-gray-700">
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Not fit */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h3 className="font-display text-lg font-bold text-gray-400">
              {t('notFitTitle')}
            </h3>
            <ul className="mt-5 space-y-4">
              {notFitItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-gray-500">
                  <CrossIcon />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-gray-400">
          {t('note')}
        </p>
      </div>
    </section>
  );
}

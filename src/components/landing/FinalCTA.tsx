'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function FinalCTA() {
  const t = useTranslations('FinalCTA');

  return (
    <section className="relative overflow-hidden bg-primary-600 py-20 sm:py-24">
      {/* Decoration */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-primary-100">
          {t('description')}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
          >
            {t('cta')}
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <p className="text-sm text-primary-200">{t('note')}</p>
        </div>
      </div>
    </section>
  );
}

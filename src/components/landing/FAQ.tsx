'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-zinc-200 bg-white px-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-6 text-left"
        aria-expanded={open}
      >
        <span className="pr-4 text-base font-semibold text-ink">{question}</span>
        <span className="shrink-0">
          <svg
            className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180 text-brand-700' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="max-w-2xl pb-1 text-sm leading-7 text-ink-muted">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const t = useTranslations('FAQ');
  const isZh = useLocale() === 'zh';

  const items = Array.from({ length: 8 }, (_, i) => ({
    question: t(`items.${i}.question`),
    answer: t(`items.${i}.answer`),
  }));

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="index-label">{isZh ? '购买前的关键问题' : 'WHAT FOUNDERS ASK BEFORE STARTING'}</p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ink-muted">{t('subtitle')}</p>
        </div>

        <div className="mt-12 border-t border-zinc-200">
          {items.map((item, index) => (
            <FAQItem key={index} question={item.question} answer={item.answer} />
          ))}
        </div>

      </div>
    </section>
  );
}

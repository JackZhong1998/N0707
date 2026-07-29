'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-hairline bg-white px-5 transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-primary-600"
      >
        <span className="pr-4 text-base font-semibold text-gray-900">{question}</span>
        <span className="shrink-0">
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
        <p className="text-sm leading-relaxed text-gray-500">{answer}</p>
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
    <section className="bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        {/* FAQ List */}
        <div className="mt-12 space-y-3">
          {items.map((item, index) => (
            <FAQItem key={index} question={item.question} answer={item.answer} />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
          <p className="text-base font-bold text-gray-900">
            {isZh ? '还想完整了解新用户进入后会发生什么？' : 'Want the complete new-user campaign walkthrough?'}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
            {isZh
              ? '查看 30 天冷启动页面，了解你会获得哪些文档、渠道计划、每日任务、制作包和每周复盘。'
              : 'See every document, channel plan, daily task, production package, and weekly review in the 30-day campaign tour.'}
          </p>
          <Link
            href="/30-day-campaign"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            {isZh ? '查看完整的 30 天体验 →' : 'See the 30-day campaign experience →'}
          </Link>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useTranslations } from 'next-intl';

const featureKeys = [
  'strategy',
  'calendar',
  'content',
  'tracking',
  'skills',
] as const;

const altColumns = ['chatgpt', 'notion', 'buffer'] as const;

function CheckIcon() {
  return (
    <svg className="mx-auto h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function PartialIcon() {
  return (
    <svg className="mx-auto h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="mx-auto h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function FeatureComparison() {
  const t = useTranslations('Features');

  return (
    <section id="features" className="bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Comparison Table */}
        <div className="mt-16 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="pb-4 pr-4 text-left text-sm font-semibold text-gray-500">
                  {t('table.feature')}
                </th>
                <th className="pb-4 px-4 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className="rounded-full bg-primary-600 px-3 py-1 text-xs font-bold text-white">
                      {t('table.nowbuild')}
                    </span>
                  </div>
                </th>
                <th className="pb-4 px-4 text-center text-sm font-semibold text-gray-500">
                  {t('table.chatgpt')}
                </th>
                <th className="pb-4 px-4 text-center text-sm font-semibold text-gray-500">
                  {t('table.notion')}
                </th>
                <th className="pb-4 pl-4 text-center text-sm font-semibold text-gray-500">
                  {t('table.buffer')}
                </th>
              </tr>
            </thead>
            <tbody>
              {featureKeys.map((key, index) => (
                <tr
                  key={key}
                  className={`border-b border-gray-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  <td className="py-4 pr-4 text-sm font-medium text-gray-900">
                    {t(`rows.${key}`)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col items-center gap-1">
                      <CheckIcon />
                      <span className="text-xs font-medium text-emerald-700">
                        {t(`rows.${key}Nowbuild`)}
                      </span>
                    </div>
                  </td>
                  {altColumns.map((col) => (
                    <td key={col} className="py-4 px-4">
                      <div className="flex flex-col items-center gap-1">
                        {col === 'chatgpt' ? <PartialIcon /> : <CrossIcon />}
                        <span className="text-xs text-gray-500">
                          {t(`rows.${key}${col.charAt(0).toUpperCase()}${col.slice(1)}`)}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

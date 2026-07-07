'use client';

import { useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import { CAMPAIGN_DURATION_DAYS } from '@/lib/gtm/types';

const WEEK_FALLBACK_ZH = ['建立信任', '展示价值', '推动转化', '复盘放大', '收官'];
const WEEK_FALLBACK_EN = ['Build trust', 'Show value', 'Drive conversion', 'Review & amplify', 'Wrap up'];

export default function CalendarPage() {
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated } = useGtm();

  useEffect(() => {
    if (!hydrated) return;
    if (state.unifiedCalendar.length === 0) {
      router.replace('/workspace/marketing');
    }
  }, [hydrated, state.unifiedCalendar.length, router]);

  if (!hydrated || state.unifiedCalendar.length === 0) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  const today = state.currentDayIndex;
  const weeklyArc = state.strategySummary?.weeklyArc;

  const weeks = Array.from({ length: Math.ceil(CAMPAIGN_DURATION_DAYS / 7) }, (_, w) => {
    const weekNum = w + 1;
    const days = Array.from({ length: 7 }, (_, d) => {
      const dayIndex = w * 7 + d + 1;
      if (dayIndex > CAMPAIGN_DURATION_DAYS) return null;
      const plan = state.unifiedCalendar.find((p) => p.dayIndex === dayIndex);
      return { dayIndex, plan };
    }).filter(Boolean) as Array<{ dayIndex: number; plan?: (typeof state.unifiedCalendar)[number] }>;

    const arcTheme = weeklyArc?.find((a) => a.week === weekNum);
    return {
      weekNum,
      theme:
        arcTheme?.theme ?? (isZh ? WEEK_FALLBACK_ZH[w] ?? '' : WEEK_FALLBACK_EN[w] ?? ''),
      focus: arcTheme?.focus,
      days,
    };
  });

  const allTasks = state.unifiedCalendar.flatMap((d) => d.tasks);
  const doneTotal = allTasks.filter((t) => t.status === 'done').length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {isZh ? '作战日历' : 'Battle Calendar'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-gray-900">
            {isZh ? '30 天全景' : '30-Day Overview'}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{isZh ? '总进度' : 'Total progress'}</p>
          <p className="font-display text-xl font-bold text-gray-900">
            {doneTotal}
            <span className="text-sm font-normal text-gray-400">/{allTasks.length}</span>
          </p>
        </div>
      </header>

      <div className="mt-8 space-y-6">
        {weeks.map((week) => (
          <section key={week.weekNum}>
            <div className="mb-2.5 flex items-baseline gap-3">
              <h2 className="text-sm font-bold text-gray-900">
                {isZh ? `第 ${week.weekNum} 周` : `Week ${week.weekNum}`}
              </h2>
              <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                {week.theme}
              </span>
              {week.focus && (
                <span className="hidden truncate text-xs text-gray-400 sm:inline" title={week.focus}>
                  {week.focus}
                </span>
              )}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {week.days.map(({ dayIndex, plan }) => {
                const tasks = plan?.tasks ?? [];
                const done = tasks.filter((t) => t.status === 'done').length;
                const allDone = tasks.length > 0 && done === tasks.length;
                const isToday = dayIndex === today;
                const isPast = dayIndex < today;

                return (
                  <Link
                    key={dayIndex}
                    href={`/workspace/marketing/today?day=${dayIndex}`}
                    title={plan?.theme}
                    className={`group relative flex min-h-[72px] flex-col rounded-lg border p-2 transition-all ${
                      isToday
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : allDone
                          ? 'border-emerald-200 bg-emerald-50'
                          : isPast
                            ? 'border-gray-100 bg-gray-50'
                            : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold ${isToday ? 'text-white' : isPast ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      {dayIndex}
                    </span>

                    {tasks.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-0.5">
                        {tasks.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              t.status === 'done'
                                ? 'bg-emerald-500'
                                : t.status === 'skipped'
                                  ? 'bg-gray-300'
                                  : isToday
                                    ? 'bg-white/70'
                                    : 'bg-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {allDone && !isToday && (
                      <svg className="absolute right-1.5 top-1.5 h-3 w-3 text-emerald-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> {isZh ? '待执行' : 'Pending'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {isZh ? '已发布' : 'Done'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" /> {isZh ? '已跳过' : 'Skipped'}
        </span>
      </div>
    </div>
  );
}

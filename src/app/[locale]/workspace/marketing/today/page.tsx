'use client';

import { useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import { getWeekCompletionRate } from '@/lib/gtm/plan-utils';
import TaskTimeline from '@/components/gtm/TaskTimeline';
import { CAMPAIGN_DURATION_DAYS, FREE_PREVIEW_DAYS } from '@/lib/gtm/types';

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading...</div>}>
      <TodayContent />
    </Suspense>
  );
}

function TodayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated } = useGtm();

  const dayParam = searchParams.get('day');
  const viewDayIndex = dayParam
    ? Math.min(Math.max(parseInt(dayParam, 10) || 1, 1), CAMPAIGN_DURATION_DAYS)
    : state.currentDayIndex;

  useEffect(() => {
    if (!hydrated) return;
    if (!state.onboardingCompleted) {
      router.replace('/workspace/onboarding');
      return;
    }
    if (state.unifiedCalendar.length === 0) {
      router.replace(state.phase === 'confirm' ? '/workspace/marketing/confirm' : '/workspace/marketing');
    }
  }, [hydrated, state, router]);

  const weekTheme = useMemo(() => {
    const week = Math.ceil(viewDayIndex / 7);
    return state.strategySummary?.weeklyArc?.find((w) => w.week === week);
  }, [state.strategySummary, viewDayIndex]);

  if (!hydrated || state.unifiedCalendar.length === 0) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  const today = state.currentDayIndex;
  const dayPlan = state.unifiedCalendar.find((d) => d.dayIndex === viewDayIndex);
  const tasks = dayPlan?.tasks ?? [];
  const weekRate = getWeekCompletionRate(state.unifiedCalendar, today);
  const doneToday = tasks.filter((t) => t.status === 'done').length;
  const isViewingToday = viewDayIndex === today;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
      {/* Header */}
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {isZh ? '30 天获客战役' : '30-Day GTM Campaign'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-gray-900">
            {isViewingToday
              ? isZh
                ? `今天 · 第 ${viewDayIndex} 天`
                : `Today · Day ${viewDayIndex}`
              : isZh
                ? `第 ${viewDayIndex} 天${viewDayIndex < today ? '（回顾）' : '（预览）'}`
                : `Day ${viewDayIndex} ${viewDayIndex < today ? '(review)' : '(preview)'}`}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{isZh ? '本周完成率' : 'Week completion'}</p>
          <p className="font-display text-xl font-bold text-gray-900">
            {Math.round(weekRate * 100)}%
          </p>
        </div>
      </header>

      {/* 7天滑动策略条 */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">
            {isZh ? '滑动查看每日安排' : 'Swipe through your plan'}
          </p>
          <Link
            href="/workspace/marketing/calendar"
            className="text-xs font-medium text-gray-400 hover:text-gray-700"
          >
            {isZh ? '查看完整日历 →' : 'Full calendar →'}
          </Link>
        </div>
        <div className="scrollbar-none -mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {state.unifiedCalendar.map((day) => {
            const dayDone = day.tasks.filter((t) => t.status === 'done').length;
            const allDone = day.tasks.length > 0 && dayDone === day.tasks.length;
            const isActive = day.dayIndex === viewDayIndex;
            const isPast = day.dayIndex < today;
            const inFreeWindow = day.dayIndex <= FREE_PREVIEW_DAYS;
            return (
              <button
                key={day.dayIndex}
                type="button"
                onClick={() => router.replace(`/workspace/marketing/today?day=${day.dayIndex}`)}
                className={`relative flex w-16 shrink-0 snap-start flex-col items-center rounded-xl border px-2 py-2.5 transition-colors ${
                  isActive
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : allDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : isPast
                        ? 'border-gray-100 bg-gray-50 text-gray-400'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-medium opacity-70">
                  {isZh ? '第' : 'D'}
                  {day.dayIndex}
                  {isZh ? '天' : ''}
                </span>
                <span className="mt-0.5 text-sm font-bold">
                  {allDone ? '✓' : `${dayDone}/${day.tasks.length}`}
                </span>
                {day.dayIndex === today && (
                  <span
                    className={`absolute -top-1 right-1.5 h-2 w-2 rounded-full ${isActive ? 'bg-white' : 'bg-gray-900'}`}
                  />
                )}
                {inFreeWindow && day.dayIndex === FREE_PREVIEW_DAYS && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-gray-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 本周策略焦点 */}
      {weekTheme && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M10 2.5l2 4.3 4.5.6-3.3 3.2.8 4.6L10 13l-4 2.2.8-4.6L3.5 7.4l4.5-.6 2-4.3z" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-gray-900">
              {isZh
                ? `第 ${Math.ceil(viewDayIndex / 7)} 周主线 · ${weekTheme.theme}`
                : `Week ${Math.ceil(viewDayIndex / 7)} · ${weekTheme.theme}`}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{weekTheme.focus}</p>
          </div>
        </div>
      )}

      {/* 今日任务时间线 */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {isZh ? '行动清单' : 'Action list'}
            <span className="ml-2 text-xs font-normal text-gray-400">
              {doneToday}/{tasks.length} {isZh ? '已完成' : 'done'}
            </span>
          </h2>
          {dayPlan?.theme && (
            <span className="max-w-[50%] truncate text-xs text-gray-400" title={dayPlan.theme}>
              {dayPlan.theme}
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-400">
              {isZh ? '这一天没有安排任务，休整或自由发挥' : 'No tasks scheduled — rest or freestyle'}
            </p>
          </div>
        ) : (
          <TaskTimeline tasks={tasks} locale={locale} />
        )}
      </section>

      {/* 战报入口 */}
      {today >= 7 && isViewingToday && (
        <Link
          href="/workspace/marketing/review/week-1"
          className="mt-6 flex items-center justify-between rounded-xl border border-gray-900 bg-gray-900 p-4 text-white transition-opacity hover:opacity-90"
        >
          <div>
            <p className="text-sm font-semibold">{isZh ? '首周战报已就绪' : 'Week 1 report ready'}</p>
            <p className="mt-0.5 text-xs text-gray-300">
              {isZh ? '看看什么内容有信号，下周怎么调整' : 'See what got signals and how to adjust'}
            </p>
          </div>
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </div>
  );
}

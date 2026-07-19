'use client';

/**
 * 每日行动日历页
 *
 * - 未支付：展示预写好的模拟日历（整个产品区由 AppShell 的蒙层 + 支付墙接管）
 * - 已支付未生成：仍展示模拟日历 + 引导横幅（去和市场总监对话）
 * - 计划就绪：展示专属真实 30 天 To-Do 日历
 *
 * 视图：从导航栏进来默认日视图；从市场总监的日历卡片进来（?view=week）显示周视图。
 */

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import CalendarBoard from '@/components/app/CalendarBoard';
import { useGtm } from '@/lib/gtm/store';
import { buildDemoTodos } from '@/lib/gtm/demo-calendar';
import { useViewContext } from '@/lib/gtm/view-context-provider';

function CalendarPageInner() {
  const { store, updateTodo } = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const searchParams = useSearchParams();
  const { setViewContext, clearViewContext } = useViewContext();
  const isPreview = !store.paid;
  const initialView = isPreview
    ? 'week'
    : searchParams.get('view') === 'week'
      ? 'week'
      : 'day';

  const demoTodos = useMemo(() => buildDemoTodos(locale), [locale]);

  // 未付费预览必须永远用 demo（与 locale 对应），不能被本地残留的空 plan 盖掉
  const usingDemo = isPreview || !store.planReady || store.todos.length === 0;
  const todos = usingDemo ? demoTodos : store.todos;

  useEffect(() => clearViewContext, [clearViewContext]);

  const handleViewStateChange = useCallback(
    (state: {
      mode: 'day' | 'week' | 'month';
      date?: string;
      rangeStart?: string;
      rangeEnd?: string;
    }) => {
      const modeLabel =
        state.mode === 'day'
          ? isZh
            ? '日视图'
            : 'Day view'
          : state.mode === 'week'
            ? isZh
              ? '周视图'
              : 'Week view'
            : isZh
              ? '月视图'
              : 'Month view';
      setViewContext({
        view: 'action_calendar',
        entityType: 'calendar_period',
        entityId: state.date ?? state.rangeStart,
        title: `${isZh ? '行动日历' : 'Action calendar'} · ${modeLabel}`,
        section: [state.rangeStart, state.rangeEnd].filter(Boolean).join(' → '),
        revision: store.todos.length,
      });
    },
    [isZh, setViewContext, store.todos.length]
  );

  return (
    <div className="relative h-full">
      {/* 已支付未生成：引导去对话 */}
      {store.paid && usingDemo && (
        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 sm:mx-6">
          <p className="text-sm text-zinc-200">
            {isZh
              ? '这是一份示例日历。去和市场总监聊聊，生成真正属于你的 30 天计划。'
              : 'This is a sample calendar. Talk to your director to generate your own 30-day plan.'}
          </p>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event('nowbuild:open-agent'))
            }
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '开始对话 →' : 'Start talking →'}
          </button>
        </div>
      )}

      <div className={store.paid && usingDemo ? 'h-[calc(100%-64px)]' : 'h-full'}>
        <CalendarBoard
          todos={todos}
          interactive={store.planReady && !usingDemo}
          initialView={initialView}
          previewMode={isPreview}
          onViewStateChange={handleViewStateChange}
          onToggleStatus={(id) => {
            const t = store.todos.find((x) => x.id === id);
            if (t) updateTodo(id, { status: t.status === 'done' ? 'pending' : 'done' });
          }}
        />
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <span className="index-label animate-pulse-soft">Loading…</span>
        </div>
      }
    >
      <CalendarPageInner />
    </Suspense>
  );
}

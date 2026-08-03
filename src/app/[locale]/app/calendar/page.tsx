'use client';

/**
 * 每日行动日历页
 *
 * - 未支付：展示预写好的模拟日历（整个产品区由 AppShell 的蒙层 + 支付墙接管）
 * - 已支付未生成：仍展示模拟日历 + 引导横幅（去和市场总监对话）
 * - 计划就绪：展示专属真实 30 天 To-Do 日历（默认全部日期）
 */

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import CalendarBoard from '@/components/app/CalendarBoard';
import { useGtm } from '@/lib/gtm/store';
import { buildDemoTodos } from '@/lib/gtm/demo-calendar';
import { useViewContext } from '@/lib/gtm/view-context-provider';

function CalendarPageInner() {
  const { store, accessStatus, updateTodo } = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const searchParams = useSearchParams();
  const { setViewContext, clearViewContext } = useViewContext();
  // While access is checking (or retrying after an error), prefer the user's
  // local workspace instead of replacing it with the unpaid demo calendar.
  const isPreview = accessStatus === 'unpaid';

  const dateParam = searchParams.get('date');
  const initialDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
  const channelParam = searchParams.get('channel');
  const initialChannelFilter =
    channelParam && channelParam.trim() ? channelParam.trim() : 'all';

  const demoTodos = useMemo(() => buildDemoTodos(locale), [locale]);

  // 未付费预览必须永远用 demo；已有真实 Todo 时优先展示，避免 planReady 同步延迟挡住日历
  const usingDemo = isPreview || store.todos.length === 0;
  const todos = usingDemo ? demoTodos : store.todos;

  useEffect(() => {
    return () => {
      clearViewContext();
    };
  }, [clearViewContext]);

  const handleViewStateChange = useCallback(
    (state: {
      mode: 'all' | 'week';
      date?: string;
      rangeStart?: string;
      rangeEnd?: string;
    }) => {
      const modeLabel =
        state.mode === 'week'
          ? isZh
            ? '按周查看'
            : 'Week view'
          : isZh
            ? '全部任务'
            : 'All tasks';
      setViewContext({
        view: 'launch_calendar',
        entityType: 'calendar_period',
        entityId: state.date ?? state.rangeStart,
        title: `Launch Calendar · ${modeLabel}`,
        section: [state.rangeStart, state.rangeEnd].filter(Boolean).join(' → '),
        revision: store.todos.length,
      });
    },
    [isZh, setViewContext, store.todos.length]
  );

  return (
    <div className="relative h-full">
      {isPreview && (
        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-300/20 bg-brand-300/[0.06] px-4 py-3 sm:mx-8">
          <p className="text-sm text-zinc-300">
            {isZh
              ? '这是执行日历预览。你的免费市场策略报告已经说明 30 天方向；组建 Agent Team 后，这里会生成专属的逐日内容与任务。'
              : 'This is the execution-calendar preview. Your free report covers the 30-day direction; Agent Team generates product-specific daily content and tasks here.'}
          </p>
          <button type="button" className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black">
            {isZh ? '付费构建我的 Launch Agent Team →' : 'Build My Launch Agent Team →'}
          </button>
        </div>
      )}
      {/* 已支付未生成：引导去对话 */}
      {store.paid && usingDemo && (
        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 sm:mx-8">
          <p className="text-sm text-zinc-400">
            {isZh
              ? '这是一份示例日历。输入产品链接后，NowBuild 会为你生成专属的 30 天冷启动计划。'
              : 'This is a sample calendar. Add your product URL to build the complete 30-day launch.'}
          </p>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event('nowbuild:open-agent'))
            }
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '开始制定计划 →' : 'Build my launch →'}
          </button>
        </div>
      )}

      <div className={(store.paid && usingDemo) || isPreview ? 'h-[calc(100%-76px)]' : 'h-full'}>
        <CalendarBoard
          todos={todos}
          interactive={!usingDemo && (store.planReady || store.todos.length > 0)}
          initialDate={initialDate}
          initialChannelFilter={initialChannelFilter}
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

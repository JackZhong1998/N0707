'use client';

/**
 * 每日行动日历页
 *
 * - 未支付：展示预写好的模拟日历（周视图填满），表层蒙版拦截点击 → 支付墙弹窗
 * - 已支付未生成：仍展示模拟日历 + 引导横幅（去和市场总监对话）
 * - 计划就绪：展示专属真实 30 天 To-Do 日历
 */

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import CalendarBoard from '@/components/app/CalendarBoard';
import Paywall from '@/components/app/Paywall';
import { useGtm } from '@/lib/gtm/store';
import { buildDemoTodos } from '@/lib/gtm/demo-calendar';

export default function CalendarPage() {
  const { store, hydrated, setPaid, updateTodo } = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const router = useRouter();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const demoTodos = useMemo(() => buildDemoTodos(), []);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="index-label animate-pulse-soft">Loading…</span>
      </div>
    );
  }

  const usingDemo = !store.planReady;
  const todos = usingDemo ? demoTodos : store.todos;

  return (
    <div className="relative h-full">
      {/* 已支付未生成：引导去对话 */}
      {store.paid && usingDemo && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-ink px-4 py-3 sm:px-6">
          <p className="text-sm text-zinc-200">
            {isZh
              ? '这是一份示例日历。去和市场总监聊聊，生成真正属于你的 30 天计划。'
              : 'This is a sample calendar. Talk to your director to generate your own 30-day plan.'}
          </p>
          <Link
            href="/app/chat"
            className="bg-white px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '开始对话 →' : 'Start talking →'}
          </Link>
        </div>
      )}

      <div className={store.paid && usingDemo ? 'h-[calc(100%-53px)]' : 'h-full'}>
        <CalendarBoard
          todos={todos}
          interactive={store.planReady}
          onToggleStatus={(id) => {
            const t = store.todos.find((x) => x.id === id);
            if (t) updateTodo(id, { status: t.status === 'done' ? 'pending' : 'done' });
          }}
        />
      </div>

      {/* 未支付：蒙版拦截所有点击 → 支付墙 */}
      {!store.paid && (
        <button
          aria-label={isZh ? '解锁' : 'Unlock'}
          onClick={() => setPaywallOpen(true)}
          className="absolute inset-0 z-30 block w-full cursor-pointer bg-gradient-to-b from-white/5 via-transparent to-white/40"
        >
          <span className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-hairline bg-white/95 px-5 py-3 text-sm font-medium text-ink shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {isZh ? '这是你 30 天后的样子 — 点击解锁专属计划' : 'This is you in 30 days — click to unlock yours'}
          </span>
        </button>
      )}

      <Paywall
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={() => {
          setPaid(true);
          setPaywallOpen(false);
          router.push('/app/chat');
        }}
      />
    </div>
  );
}

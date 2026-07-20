'use client';

/**
 * 统一产品工作台
 * - 黑色网格是 Agent 的行动空间
 * - 左侧工作画布展示 Agent 的执行结果
 * - 右侧市场合伙人是唯一、常驻的交互入口
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { UserButton } from '@clerk/nextjs';
import { Link, useRouter } from '@/i18n/navigation';
import Logo from '@/components/Logo';
import AgentPanelView, {
  type AgentPanelMessage,
} from '@/components/app/AgentPanelView';
import AgentBootstrap from '@/components/app/AgentBootstrap';
import AutoMetricsSync from '@/components/app/AutoMetricsSync';
import Paywall from '@/components/app/Paywall';
import { GtmProvider, useGtm } from '@/lib/gtm/store';
import type { ChatMessage, MessageCard } from '@/lib/gtm/types';
import { useDirector } from '@/lib/gtm/use-director';
import {
  ViewContextProvider,
  useViewContext,
} from '@/lib/gtm/view-context-provider';
import type { ViewContext } from '@/lib/gtm/view-context';

const isClerkConfigured =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

type NavigationKey =
  | 'calendar'
  | 'topics'
  | 'posts'
  | 'strategy'
  | 'publisher'
  | 'chat';

type NavigationItem = {
  key: NavigationKey;
  href: string;
  label: string;
  description: string;
  icon: 'calendar' | 'topics' | 'posts' | 'strategy' | 'plugin';
  lowFrequency?: boolean;
};

function NavIcon({
  name,
  className = 'h-[18px] w-[18px]',
}: {
  name: NavigationItem['icon'] | 'menu' | 'agent';
  className?: string;
}) {
  if (name === 'menu') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    );
  }
  if (name === 'agent') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.75c.42 4.97 3.28 7.83 8.25 8.25-4.97.42-7.83 3.28-8.25 8.25C11.58 14.28 8.72 11.42 3.75 11 8.72 10.58 11.58 7.72 12 2.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75Zm0-9.75h18" />
      </svg>
    );
  }
  if (name === 'topics') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h9m-9 5h9m-9 5h5.25M5.25 2.75h13.5A2.25 2.25 0 0 1 21 5v14a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 19V5a2.25 2.25 0 0 1 2.25-2.25Z" />
      </svg>
    );
  }
  if (name === 'posts') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7.5 16.5l3.75-4.5 3 2.25L19.5 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5h3v3" />
      </svg>
    );
  }
  if (name === 'plugin') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v3m7.5-3v3M6 9h12v2.25A6 6 0 0 1 12 17.25a6 6 0 0 1-6-6V9Zm6 8.25V21" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.63a3.38 3.38 0 0 0-3.38-3.37h-1.5a1.13 1.13 0 0 1-1.12-1.13v-1.5a3.38 3.38 0 0 0-3.38-3.37H5.63A1.13 1.13 0 0 0 4.5 3.38v17.24a1.13 1.13 0 0 0 1.13 1.13h12.74a1.13 1.13 0 0 0 1.13-1.13v-6.37ZM8.25 15h7.5m-7.5 3H12" />
    </svg>
  );
}

function AvatarFallback() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
      U
    </div>
  );
}

function getActiveKey(pathname: string): NavigationKey {
  if (pathname.includes('/app/topics')) return 'topics';
  if (pathname.includes('/app/posts')) return 'posts';
  if (pathname.includes('/app/strategy')) return 'strategy';
  if (pathname.includes('/app/publisher-extension')) return 'publisher';
  if (pathname.includes('/app/chat')) return 'chat';
  return 'calendar';
}

function getRouteViewContext(
  pathname: string,
  isZh: boolean
): ViewContext {
  const taskMatch = pathname.match(/\/app\/calendar\/task\/([^/?]+)/);
  if (taskMatch) {
    return {
      view: 'todo_detail',
      entityType: 'todo',
      entityId: decodeURIComponent(taskMatch[1]),
      title: isZh ? 'To-Do 详情' : 'To-do details',
    };
  }
  if (pathname.includes('/app/topics')) {
    return {
      view: 'topic_library',
      entityType: 'topic_collection',
      title: isZh ? '选题库' : 'Topic library',
    };
  }
  if (pathname.includes('/app/posts')) {
    return {
      view: 'post_metrics',
      entityType: 'post_collection',
      title: isZh ? '帖子与数据' : 'Posts & metrics',
    };
  }
  if (pathname.includes('/app/strategy')) {
    return {
      view: 'market_strategy',
      entityType: 'strategy',
      title: isZh ? '市场策略' : 'Market strategy',
    };
  }
  if (pathname.includes('/app/publisher-extension')) {
    return {
      view: 'publisher_extension',
      entityType: 'integration',
      title: isZh ? '发布插件' : 'Publishing extension',
    };
  }
  if (pathname.includes('/app/chat')) {
    return {
      view: 'legacy_conversation',
      title: isZh ? '市场合伙人对话' : 'Partner conversation',
    };
  }
  return {
    view: 'action_calendar',
    entityType: 'calendar',
    title: isZh ? '行动日历' : 'Action calendar',
  };
}

function mapMessageArtifact(
  card: MessageCard | undefined,
  isZh: boolean
): AgentPanelMessage['artifact'] {
  if (!card) return undefined;
  if (card.kind === 'agent-task') {
    return { label: card.label, status: card.status };
  }
  if (card.kind === 'strategy') {
    return { label: card.title, status: 'done', href: '/app/strategy' };
  }
  if (card.kind === 'calendar') {
    return { label: card.title, status: 'done', href: '/app/calendar' };
  }
  if (card.kind === 'options') {
    return undefined;
  }
  if (card.kind === 'artifact') {
    return {
      label: card.title,
      status: card.status === 'waiting_approval' ? 'waiting' : 'done',
      href: `/app/artifacts/${card.artifactId}`,
    };
  }
  return undefined;
}

function toPanelMessage(
  message: ChatMessage,
  isZh: boolean
): AgentPanelMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    replyToMessageIds: message.replyToMessageIds,
    card: message.card,
    artifact: mapMessageArtifact(message.card, isZh),
  };
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const { store, hydrated, markAgentNotificationRead } = useGtm();
  const { viewContext, setViewContext, clearViewContext } = useViewContext();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [agentCollapsed, setAgentCollapsed] = useState(false);
  const [mobileAgentOpen, setMobileAgentOpen] = useState(false);
  const [input, setInput] = useState('');
  const autoReviewStarted = useRef(false);

  const items = useMemo<NavigationItem[]>(
    () => [
      {
        key: 'calendar',
        href: '/app/calendar',
        label: isZh ? '行动日历' : 'Action calendar',
        description: isZh ? '今天和未来要推进的行动' : 'Actions for today and what comes next',
        icon: 'calendar',
      },
      {
        key: 'topics',
        href: '/app/topics',
        label: isZh ? '选题库' : 'Topic library',
        description: isZh ? '核心选题与渠道表达版本' : 'Core topics and channel variants',
        icon: 'topics',
      },
      {
        key: 'posts',
        href: '/app/posts',
        label: isZh ? '帖子与数据' : 'Posts & data',
        description: isZh ? '已发布内容与表现证据' : 'Published work and performance evidence',
        icon: 'posts',
      },
      {
        key: 'strategy',
        href: '/app/strategy',
        label: isZh ? '市场策略' : 'Market strategy',
        description: isZh ? '定位、渠道和增长计划' : 'Positioning, channels, and growth plan',
        icon: 'strategy',
        lowFrequency: true,
      },
      {
        key: 'publisher',
        href: '/app/publisher-extension',
        label: isZh ? '发布插件' : 'Publishing extension',
        description: isZh ? '安装、检测与连接状态' : 'Install, inspect, and check connections',
        icon: 'plugin',
        lowFrequency: true,
      },
    ],
    [isZh]
  );

  const activeKey = getActiveKey(pathname);
  const isCalendarIndex = /\/app\/calendar\/?$/.test(pathname);
  const routeViewContext = useMemo(
    () => getRouteViewContext(pathname, isZh),
    [pathname, isZh]
  );
  const resolvedViewContext = viewContext ?? routeViewContext;
  const {
    send,
    sending,
    busy,
    pendingCount,
    submitOptions,
    submitKickoff,
    enqueueActions,
  } = useDirector(resolvedViewContext);

  const panelMessages = useMemo<AgentPanelMessage[]>(
    () => store.directorChat.map((message) => toPanelMessage(message, isZh)),
    [store.directorChat, isZh]
  );
  const panelNotifications = useMemo(
    () =>
      store.agentNotifications
        .filter((notification) => !notification.read)
        .map((notification) => ({
          id: notification.id,
          title: notification.title,
          summary: notification.summary,
          priority: notification.priority,
          href: notification.artifactId
            ? `/app/artifacts/${notification.artifactId}`
            : undefined,
        })),
    [store.agentNotifications]
  );

  // 预取所有工作区视图，导航菜单打开后可立即切换。
  useEffect(() => {
    for (const item of items) router.prefetch(item.href);
  }, [items, router]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileAgentOpen(false);
  }, [pathname]);

  useEffect(() => {
    const openAgent = (event: Event) => {
      const prefill =
        event instanceof CustomEvent &&
        typeof event.detail?.prefill === 'string'
          ? event.detail.prefill.trim()
          : '';
      if (prefill) {
        setInput((current) => current || prefill);
      }
      setAgentCollapsed(false);
      if (window.matchMedia('(max-width: 767px)').matches) {
        setMobileAgentOpen(true);
      }
    };
    window.addEventListener('nowbuild:open-agent', openAgent);
    return () => window.removeEventListener('nowbuild:open-agent', openAgent);
  }, []);

  useEffect(() => {
    const writeTodo = (event: Event) => {
      const todoId =
        event instanceof CustomEvent &&
        typeof event.detail?.todoId === 'string'
          ? event.detail.todoId.slice(0, 160)
          : '';
      if (!todoId) return;
      enqueueActions(
        [{ type: 'generate_todo_content', todoId }],
        [],
        `write-todo-${todoId}`
      );
    };
    window.addEventListener('nowbuild:write-todo', writeTodo);
    return () =>
      window.removeEventListener('nowbuild:write-todo', writeTodo);
  }, [enqueueActions]);

  // 未支付时只允许查看示例日历。
  useEffect(() => {
    if (!hydrated) return;
    if (!store.paid && !isCalendarIndex) {
      router.replace('/app/calendar');
    }
  }, [hydrated, store.paid, isCalendarIndex, router]);

  // 主动复盘不插队到当前会话：满足一周数据条件后静默执行，结果进入通知箱。
  useEffect(() => {
    if (!hydrated || !store.paid || autoReviewStarted.current) return;
    const measuredTodos = store.todos.filter(
      (todo) =>
        Boolean(todo.publishedUrl) && (todo.metricSnapshots?.length ?? 0) > 0
    );
    if (measuredTodos.length < 3) return;

    const now = Date.now();
    const sixDays = 6 * 24 * 60 * 60 * 1000;
    const evidenceTimes = measuredTodos.flatMap((todo) => [
      ...(todo.publishedAt ? [todo.publishedAt] : []),
      ...(todo.metricSnapshots ?? []).map((snapshot) => snapshot.collectedAt),
    ]);
    const oldestEvidence = Math.min(...evidenceTimes);
    const latestEvidence = Math.max(...evidenceTimes);
    const previousReview = store.lastReflectionAt ?? 0;
    const enoughHistory =
      Number.isFinite(oldestEvidence) && now - oldestEvidence >= sixDays;
    const reviewDue =
      previousReview === 0 || now - previousReview >= sixDays;
    const hasNewEvidence = latestEvidence > previousReview;
    if (!enoughHistory || !reviewDue || !hasNewEvidence) return;

    const timer = window.setTimeout(() => {
      if (autoReviewStarted.current) return;
      autoReviewStarted.current = true;
      const weekBucket = Math.floor(now / (7 * 24 * 60 * 60 * 1000));
      enqueueActions(
        [{ type: 'generate_weekly_review', silent: true }],
        [],
        `weekly-review-${weekBucket}`
      );
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    enqueueActions,
    store.lastReflectionAt,
    store.paid,
    store.todos,
  ]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    send(text, { viewContext: resolvedViewContext });
  }, [input, resolvedViewContext, send]);

  const captureWorkspaceSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) return;
    setViewContext({
      ...resolvedViewContext,
      selectedText: selectedText.slice(0, 2_000),
    });
  }, [resolvedViewContext, setViewContext]);

  const locked = hydrated && !store.paid;
  const restrictedUnpaidView = locked && !isCalendarIndex;

  const navigationMenu = menuOpen && (
    <>
      <button
        type="button"
        aria-label={isZh ? '关闭菜单' : 'Close menu'}
        onClick={() => setMenuOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-black/25 backdrop-blur-[1px]"
      />
      <nav className="fixed left-2 top-[60px] z-50 w-[min(288px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-white/10 bg-[#151619]/95 p-2 text-white shadow-2xl backdrop-blur-xl md:left-16 md:top-2">
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600">
            {isZh ? '工作空间' : 'Workspace'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {isZh ? '查看 Agent 的行动与结果' : 'See your agent’s actions and results'}
          </p>
        </div>
        <div className="space-y-0.5">
          {items.map((item, index) => {
            const active = activeKey === item.key;
            const startsLowFrequency =
              item.lowFrequency && !items[index - 1]?.lowFrequency;
            return (
              <div key={item.key}>
                {startsLowFrequency && (
                  <div className="mx-2 my-2 h-px bg-white/[0.07]" />
                )}
                <Link
                  href={item.href}
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${
                    active
                      ? 'bg-white text-black'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active ? 'bg-black/[0.06]' : 'bg-white/[0.05]'
                    }`}
                  >
                    <NavIcon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span
                      className={`mt-0.5 block truncate text-[10px] ${
                        active ? 'text-zinc-500' : 'text-zinc-600'
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-3 border-t border-white/[0.07] px-2.5 pt-3 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center">
            {isClerkConfigured ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <AvatarFallback />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-200">
              {isZh ? '我的账号' : 'My account'}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              {isZh ? '账号与退出登录' : 'Account and sign out'}
            </p>
          </div>
        </div>
      </nav>
    </>
  );

  return (
    <div className="bg-grid-dark relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#08090b] md:flex-row">
      <AutoMetricsSync />
      <AgentBootstrap />

      {/* 56px 品牌栏：Logo 与产品控制在左，账号固定在左下角。 */}
      <aside className="relative z-30 hidden h-full w-14 shrink-0 flex-col items-center border-r border-white/[0.07] bg-black/30 py-2 md:flex">
        <Link
          href="/"
          title="NowBuild"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-[family-name:var(--font-display)] text-sm font-black tracking-tighter text-white transition-colors hover:bg-white/[0.08]"
        >
          <span className="-rotate-6 text-red-500">N</span>
          <span className="text-red-500">B</span>
        </Link>

        <nav className="mt-4 flex flex-col items-center gap-1.5">
          {items.map((item, index) => {
            const active = activeKey === item.key;
            const startsLowFrequency =
              item.lowFrequency && !items[index - 1]?.lowFrequency;
            return (
              <div key={item.key} className="flex flex-col items-center">
                {startsLowFrequency && (
                  <div className="my-1.5 h-px w-7 bg-white/[0.08]" />
                )}
                <Link
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    active
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <NavIcon name={item.icon} />
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto mb-2 h-px w-7 bg-white/[0.08]" />
        <div className="flex h-10 w-10 items-center justify-center">
          {isClerkConfigured ? <UserButton afterSignOutUrl="/" /> : <AvatarFallback />}
        </div>
      </aside>

      {/* 移动端紧凑顶栏；Agent 以全屏抽屉打开。 */}
      <header className="relative z-30 flex h-13 shrink-0 items-center justify-between border-b border-white/[0.07] bg-black/40 px-2.5 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300"
          aria-label={isZh ? '打开工作空间菜单' : 'Open workspace menu'}
          aria-expanded={menuOpen}
        >
          <NavIcon name="menu" className="h-4 w-4" />
        </button>
        <Link href="/" className="scale-90">
          <Logo dark showTagline={false} />
        </Link>
        <button
          type="button"
          onClick={() => setMobileAgentOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black"
          aria-label={isZh ? '打开市场合伙人' : 'Open marketing partner'}
        >
          <NavIcon name="agent" className="h-4 w-4" />
          {panelNotifications.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#08090b] bg-amber-300 px-0.5 text-[8px] font-bold text-black">
              {panelNotifications.length > 9 ? '9+' : panelNotifications.length}
            </span>
          ) : (busy || pendingCount > 0) && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#08090b] bg-emerald-400" />
          )}
        </button>
      </header>

      {navigationMenu}

      <div className="flex min-h-0 min-w-0 flex-1 gap-2 p-2 md:pl-2">
        {/* 左侧执行工作台 */}
        <main
          onMouseUp={captureWorkspaceSelection}
          onKeyUp={captureWorkspaceSelection}
          className="agent-workspace bg-grid-dark min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0c0e] text-zinc-200 shadow-2xl"
        >
          <div className="h-full overflow-y-auto">{children}</div>
        </main>

        {/* 桌面端常驻 Agent；收起后保留状态轨道。 */}
        <AgentPanelView
          messages={panelMessages}
          artifacts={store.artifacts}
          notifications={panelNotifications}
          input={input}
          onInput={setInput}
          onSend={handleSend}
          onSubmitOptions={submitOptions}
          onSubmitKickoff={submitKickoff}
          onReadNotification={markAgentNotificationRead}
          sending={sending}
          busy={busy}
          pendingCount={pendingCount}
          viewContext={resolvedViewContext}
          onClearViewContext={viewContext ? clearViewContext : undefined}
          collapsed={agentCollapsed}
          onToggleCollapsed={() => setAgentCollapsed((collapsed) => !collapsed)}
          isZh={isZh}
          className={
            agentCollapsed
              ? 'hidden md:flex'
              : 'hidden w-[min(420px,36vw)] min-w-[340px] md:flex 2xl:w-[430px]'
          }
        />
      </div>

      {/* 移动端 Agent 抽屉，不挤压工作画布。 */}
      {mobileAgentOpen && (
        <div className="fixed inset-0 z-40 bg-[#08090b] p-2 md:hidden">
          <AgentPanelView
            messages={panelMessages}
            artifacts={store.artifacts}
            notifications={panelNotifications}
            input={input}
            onInput={setInput}
            onSend={handleSend}
            onSubmitOptions={submitOptions}
            onSubmitKickoff={submitKickoff}
            onReadNotification={markAgentNotificationRead}
            sending={sending}
            busy={busy}
            pendingCount={pendingCount}
            viewContext={resolvedViewContext}
            onClearViewContext={viewContext ? clearViewContext : undefined}
            onToggleCollapsed={() => setMobileAgentOpen(false)}
            isZh={isZh}
            className="w-full"
          />
        </div>
      )}

      {/* 服务端订阅状态返回前不暴露可交互页面。 */}
      {!hydrated && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#08090b]/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#151619] px-5 py-4 text-sm text-zinc-400 shadow-2xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
            {isZh ? '正在检查订阅状态…' : 'Checking subscription…'}
          </div>
        </div>
      )}

      {/* 未支付：日历页透明遮罩仅预览，点击打开付费墙；其他页面全屏遮挡。 */}
      {locked && (
        <button
          type="button"
          aria-label={isZh ? '解锁' : 'Unlock'}
          onClick={() => setPaywallOpen(true)}
          className={`absolute inset-0 z-50 block w-full cursor-pointer ${
            restrictedUnpaidView ? 'bg-[#08090b]' : 'bg-transparent'
          }`}
        />
      )}

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GtmProvider>
      <ViewContextProvider>
        <ShellInner>{children}</ShellInner>
      </ViewContextProvider>
    </GtmProvider>
  );
}

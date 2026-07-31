'use client';

/**
 * 统一产品工作台
 * - 黑色网格是 Agent 的行动空间
 * - 左侧工作画布展示 Agent 的执行结果
 * - 右侧市场合伙人是唯一、常驻的交互入口
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { UserButton } from '@clerk/nextjs';
import { Link, useRouter } from '@/i18n/navigation';
import Logo, { LogoMark } from '@/components/Logo';
import AgentPanelView, {
  type AgentPanelMessage,
} from '@/components/app/AgentPanelView';
import AgentBootstrap from '@/components/app/AgentBootstrap';
import AutoMetricsSync from '@/components/app/AutoMetricsSync';
import ResumeOnReturn from '@/components/app/ResumeOnReturn';
import Paywall from '@/components/app/Paywall';
import CampaignBootstrap from '@/components/app/launch/CampaignBootstrap';
import FreeLaunchResearchRunner from '@/components/app/launch/FreeLaunchResearchRunner';
import { GtmProvider, useGtm } from '@/lib/gtm/store';
import { channelHasCalendarTodos } from '@/lib/gtm/channel-capabilities';
import type { ChatMessage, MessageCard } from '@/lib/gtm/types';
import { useDirector } from '@/lib/gtm/use-director';
import {
  ViewContextProvider,
  useViewContext,
} from '@/lib/gtm/view-context-provider';
import type { ViewContext } from '@/lib/gtm/view-context';
import { detectPublisherExtension } from '@/lib/gtm/publisher-extension';
import {
  isOlderExtensionVersion,
  PUBLISHER_EXTENSION_VERSION,
} from '@/lib/gtm/publisher-extension-version';

const isClerkConfigured =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

type NavigationKey =
  | 'todo'
  | 'documents'
  | 'directory'
  | 'posts'
  | 'publisher';

type NavigationItem = {
  key: NavigationKey;
  href: string;
  label: string;
  description: string;
  icon:
    | 'calendar'
    | 'blueprint'
    | 'channels'
    | 'data'
    | 'plugin';
  iconTone: string;
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3M17 3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" />
        <path strokeLinecap="round" d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" strokeWidth="2.4" />
      </svg>
    );
  }
  if (name === 'blueprint') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 6.5 5-3 7 3 5-3v14l-5 3-7-3-5 3v-14Z" />
        <path strokeLinecap="round" d="M8.5 3.5v14M15.5 6.5v14" />
        <path strokeLinecap="round" strokeDasharray="1.5 2.2" d="m5.8 12.5 2.7-1.6 7 3 2.2-1.3" />
      </svg>
    );
  }
  if (name === 'channels') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="2.75" />
        <circle cx="5" cy="6" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="5" cy="18" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path strokeLinecap="round" d="m7 7.7 2.9 2.5M17 7.7l-2.9 2.5M7 16.3l2.9-2.5M17 16.3l-2.9-2.5" />
      </svg>
    );
  }
  if (name === 'data') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16.5V11M12 16.5V7.5M17 16.5v-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.25 11h1.5M11.25 7.5h1.5M16.25 13.5h1.5" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v4.25M15.75 3v4.25M6 7.25h12v3A5.75 5.75 0 0 1 12.25 16H11.75A5.75 5.75 0 0 1 6 10.25v-3ZM12 16v5" />
      <path strokeLinecap="round" d="M9.5 11.25h5" />
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
  if (pathname.includes('/app/posts')) return 'posts';
  if (pathname.includes('/app/directories') || pathname.includes('/app/launch-kit')) {
    return 'directory';
  }
  if (
    pathname.includes('/app/documents') ||
    pathname.includes('/app/artifacts') ||
    pathname.includes('/app/brief') ||
    pathname.includes('/app/blueprint') ||
    pathname.includes('/app/channel-recommendations') ||
    pathname.includes('/app/channels')
  ) {
    return 'documents';
  }
  if (pathname.includes('/app/publisher-extension')) return 'publisher';
  return 'todo';
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
      title: isZh ? '任务详情' : 'To-do details',
    };
  }
  const channelMatch = pathname.match(/\/app\/channels\/([^/?]+)/);
  if (channelMatch) {
    return {
      view: 'channel_workspace',
      entityType: 'channel_plan',
      entityId: decodeURIComponent(channelMatch[1]),
      channelId: decodeURIComponent(channelMatch[1]),
      title: `${decodeURIComponent(channelMatch[1])} Agent`,
    };
  }
  if (pathname.includes('/app/directories') || pathname.includes('/app/launch-kit')) {
    return {
      view: 'directory_pipeline',
      entityType: 'directory_pipeline',
      channelId: 'directory',
      title: isZh ? 'Directory' : 'Directory',
    };
  }
  if (pathname.includes('/app/brief')) {
    return {
      view: 'launch_brief',
      entityType: 'launch_brief',
      title: isZh ? '项目文档' : 'Project document',
    };
  }
  if (pathname.includes('/app/documents/')) {
    const docMatch = pathname.match(/\/app\/documents\/([^/?]+)/);
    const docId = docMatch ? decodeURIComponent(docMatch[1]) : undefined;
    if (docId === 'project') {
      return {
        view: 'document_detail',
        entityType: 'launch_brief',
        title: isZh ? '项目文档' : 'Project document',
        section: 'project',
      };
    }
    return {
      view: 'document_detail',
      entityType: 'document',
      entityId: docId,
      title: isZh ? '文档详情' : 'Document',
    };
  }
  if (pathname.includes('/app/documents')) {
    return {
      view: 'documents',
      entityType: 'document_collection',
      title: isZh ? '文档' : 'Documents',
    };
  }
  if (pathname.includes('/app/channel-recommendations')) {
    return {
      view: 'channel_recommendations',
      entityType: 'channel_recommendations',
      title: isZh ? '渠道推荐' : 'Channel Recommendations',
    };
  }
  if (pathname.includes('/app/blueprint')) {
    return {
      view: 'launch_blueprint',
      entityType: 'launch_blueprint',
      title: isZh ? '推广蓝图' : 'Campaign Blueprint',
    };
  }
  if (pathname.includes('/app/posts')) {
    return {
      view: 'post_metrics',
      entityType: 'post_collection',
      title: isZh ? '数据' : 'Data',
    };
  }
  if (pathname.includes('/app/publisher-extension')) {
    return {
      view: 'publisher_extension',
      entityType: 'integration',
      title: isZh ? '插件' : 'Plugins',
    };
  }
  return {
    view: 'launch_calendar',
    entityType: 'calendar',
    title: isZh ? 'Todo' : 'Todo',
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
    return {
      label: card.title,
      status: 'done',
      href: '/app/documents/recommendations',
    };
  }
  if (card.kind === 'channel_recommendations') {
    return {
      label: card.title,
      status: 'done',
      href: '/app/documents/recommendations',
    };
  }
  if (card.kind === 'channel_plan') {
    const href = channelHasCalendarTodos(card.channelId)
      ? `/app/documents/channel-${encodeURIComponent(card.channelId)}`
      : '/app/directories';
    return {
      label: `${card.channelName} · ${isZh ? '渠道计划' : 'Channel plan'}`,
      status: 'done',
      href,
    };
  }
  if (card.kind === 'channel_todos') {
    const href = channelHasCalendarTodos(card.channelId)
      ? `/app/calendar?channel=${encodeURIComponent(card.channelId)}`
      : '/app/directories';
    return {
      label: `${card.channelName} · ${card.todoCount} ${isZh ? '个任务' : 'tasks'}`,
      status: 'done',
      href,
    };
  }
  if (card.kind === 'directory_pipeline') {
    const suffix =
      typeof card.pendingCount === 'number' && card.pendingCount > 0
        ? ` · ${card.pendingCount} ${isZh ? '个待提交' : 'to submit'}`
        : '';
    return {
      label: `${isZh ? '产品目录 · 提交流水线' : 'Directories · submission pipeline'}${suffix}`,
      status: 'done',
      href: '/app/directories',
    };
  }
  if (card.kind === 'calendar') {
    return { label: card.title, status: 'done', href: '/app/calendar' };
  }
  if (card.kind === 'options') {
    return undefined;
  }
  if (card.kind === 'paywall_cta') {
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
  const {
    store,
    hydrated,
    accessStatus,
    update,
    markAgentNotificationRead,
  } = useGtm();
  const { viewContext, setViewContext, clearViewContext } = useViewContext();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [agentCollapsed, setAgentCollapsed] = useState(false);
  const [mobileAgentOpen, setMobileAgentOpen] = useState(false);
  const [input, setInput] = useState('');
  const [extensionNeedsUpdate, setExtensionNeedsUpdate] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 42, y: 28 });
  const autoReviewStarted = useRef(false);
  const glowRaf = useRef(0);

  const handleShellPointerMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const { clientX, clientY, currentTarget } = event;
      cancelAnimationFrame(glowRaf.current);
      glowRaf.current = requestAnimationFrame(() => {
        const rect = currentTarget.getBoundingClientRect();
        setGlowPos({
          x: ((clientX - rect.left) / rect.width) * 100,
          y: ((clientY - rect.top) / rect.height) * 100,
        });
      });
    },
    []
  );

  useEffect(() => {
    return () => cancelAnimationFrame(glowRaf.current);
  }, []);

  useEffect(() => {
    const openPaywall = () => setPaywallOpen(true);
    window.addEventListener('nowbuild:open-paywall', openPaywall);
    return () => window.removeEventListener('nowbuild:open-paywall', openPaywall);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void detectPublisherExtension().then((publisher) => {
      if (cancelled) return;
      setExtensionNeedsUpdate(
        publisher.installed === true &&
          isOlderExtensionVersion(publisher.version, PUBLISHER_EXTENSION_VERSION)
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!store.launch || store.launch.project.status !== 'active') return;
    const start = new Date(`${store.launch.project.startDate}T12:00:00`).getTime();
    const currentDay = Math.max(
      1,
      Math.min(30, Math.floor((Date.now() - start) / 86_400_000) + 1)
    );
    if (currentDay === store.launch.project.currentDay) return;
    update({
      launch: {
        ...store.launch,
        project: {
          ...store.launch.project,
          currentDay,
          ...(currentDay >= 30
            ? { phase: 'completed' as const, status: 'completed' as const }
            : {}),
          updatedAt: Date.now(),
        },
      },
    });
  }, [store.launch, update]);

  const items = useMemo<NavigationItem[]>(
    () => [
      {
        key: 'todo',
        href: '/app/calendar',
        label: 'Todo',
        description: isZh ? '按渠道查看 30 天任务' : '30-day tasks by channel',
        icon: 'calendar',
        iconTone: 'bg-amber-400/12 text-amber-300',
      },
      {
        key: 'documents',
        href: '/app/documents',
        label: isZh ? '文档' : 'Documents',
        description: isZh
          ? '项目文档、用户档案、渠道推荐与策略'
          : 'Project doc, profile, recommendations, strategies',
        icon: 'blueprint',
        iconTone: 'bg-brand-500/12 text-brand-300',
      },
      {
        key: 'directory',
        href: '/app/directories',
        label: 'Directory',
        description: isZh
          ? '提交资料与推荐目录（固定能力）'
          : 'Submission kit and directory list (always on)',
        icon: 'channels',
        iconTone: 'bg-emerald-500/12 text-emerald-300',
      },
      {
        key: 'posts',
        href: '/app/posts',
        label: isZh ? '数据' : 'Data',
        description: isZh ? '已发布内容及真实表现' : 'Published work and metrics',
        icon: 'data',
        iconTone: 'bg-cyan-500/12 text-cyan-300',
      },
      {
        key: 'publisher',
        href: '/app/publisher-extension',
        label: isZh ? '插件' : 'Plugins',
        description: isZh ? '安装、检测与连接状态' : 'Install and connection status',
        icon: 'plugin',
        iconTone: 'bg-orange-500/12 text-orange-300',
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

  const workspaceStatus = useMemo(() => {
    const launch = store.launch;
    if (!launch) return null;
    if (!['researching', 'building_team', 'blueprint_ready'].includes(launch.project.phase)) {
      return null;
    }
    const done = launch.researchProgress.filter((step) =>
      ['done', 'warning'].includes(step.status)
    ).length;
    const total = launch.researchProgress.length;
    const active = launch.researchProgress.find((step) => step.status === 'running');
    if (launch.project.phase === 'building_team') {
      const channelStep = launch.researchProgress.find((step) => step.id === 'channels' || step.id === 'calendar');
      return (
        channelStep?.detail ||
        active?.label ||
        (isZh
          ? `正在生成推广计划 · ${done}/${total}`
          : `Building campaign · ${done}/${total}`)
      );
    }
    return (
      active?.label ||
      (isZh ? `正在分析 · ${done}/${total}` : `Analyzing · ${done}/${total}`)
    );
  }, [isZh, store.launch]);

  const panelBusy = busy || Boolean(workspaceStatus);

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

  // Free tier may stay on onboarding, research progress, project docs, and brief.
  // Paid-only destinations keep the paywall; do not force unpaid users to calendar.
  // Users who already have todos land on calendar (handled by /app index).
  useEffect(() => {
    if (!hydrated || accessStatus !== 'unpaid' || !store.launch) return;
    if (store.todos.length > 0) return;
    const phase = store.launch.project.phase;
    const freePath =
      /\/app\/?$/.test(pathname) ||
      pathname.includes('/app/brief') ||
      pathname.includes('/app/documents');
    if (
      phase === 'brief_ready' &&
      !pathname.includes('/app/brief') &&
      !pathname.includes('/app/documents')
    ) {
      router.replace('/app/documents/project');
      return;
    }
    // Keep users on the research runner by default, but do not fight intentional
    // navigation to previewable surfaces (calendar paywall, docs, directories).
    if (
      (phase === 'researching' || phase === 'building_team') &&
      !/\/app\/?$/.test(pathname) &&
      !pathname.includes('/app/calendar') &&
      !pathname.includes('/app/documents') &&
      !pathname.includes('/app/directories')
    ) {
      router.replace('/app');
      return;
    }
    if (!freePath && phase === 'brief_ready') {
      router.replace('/app/documents/project');
    }
  }, [
    accessStatus,
    hydrated,
    pathname,
    router,
    store.launch,
    store.todos.length,
  ]);

  // 主动复盘不插队到当前会话：满足一周数据条件后静默执行，结果进入通知箱。
  useEffect(() => {
    if (!hydrated || !store.paid || autoReviewStarted.current) return;
    const dueWeek = store.launch
      ? Math.min(4, Math.floor(store.launch.project.currentDay / 7))
      : 0;
    const dueLaunchReview = store.launch?.weeklyReviews.find(
      (review) => review.week === dueWeek && review.status === 'upcoming'
    );
    if (dueLaunchReview) {
      autoReviewStarted.current = true;
      enqueueActions(
        [{ type: 'generate_weekly_review', silent: true }],
        [],
        `launch-weekly-review-${store.launch!.project.id}-${dueWeek}`
      );
      return;
    }
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
    store.launch,
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

  // Free workspace: onboarding URL form, research progress, and Launch Brief.
  // Paywall only locks paid execution surfaces (calendar, tasks, blueprint, etc.).
  const onboarding = hydrated && !store.launch;
  const freeUnpaidWorkspace =
    accessStatus === 'unpaid' &&
    (onboarding ||
      /\/app\/?$/.test(pathname) ||
      pathname.includes('/app/brief') ||
      pathname.includes('/app/documents'));
  const locked = accessStatus === 'unpaid' && !freeUnpaidWorkspace;
  const restrictedUnpaidView = locked && !isCalendarIndex;

  const navigationMenu = menuOpen && (
    <>
      <button
        type="button"
        aria-label={isZh ? '关闭菜单' : 'Close menu'}
        onClick={() => setMenuOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-black/25 backdrop-blur-[1px]"
      />
      <nav className="fixed left-2 top-[60px] z-50 w-[min(288px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-white/10 bg-night-panel/95 p-2 text-white shadow-2xl backdrop-blur-xl md:left-16 md:top-2">
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600">
            {isZh ? '工作台导航' : 'Workspace'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {isZh ? '查看团队正在做什么、已经完成什么' : 'See your agent’s actions and results'}
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
                      active ? 'bg-black/[0.06] text-black' : item.iconTone
                    }`}
                  >
                    <NavIcon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="block text-xs font-semibold">{item.label}</span>
                      {item.key === 'publisher' && extensionNeedsUpdate && (
                        <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          {isZh ? '有更新' : 'Update'}
                        </span>
                      )}
                    </span>
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
    <div
      className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-black md:flex-row"
      onMouseMove={handleShellPointerMove}
    >
      <div className="bg-grid-app pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.11] blur-[140px] transition-[left,top] duration-500 ease-out"
        style={{ left: `${glowPos.x}%`, top: `${glowPos.y}%` }}
        aria-hidden
      />
      <AutoMetricsSync />
      <ResumeOnReturn />
      <FreeLaunchResearchRunner />
      <AgentBootstrap />

      {/* 56px 品牌栏：Logo 与产品控制在左，账号固定在左下角。 */}
      <aside className="relative z-30 hidden h-full w-14 shrink-0 flex-col items-center border-r border-white/[0.07] bg-black/30 py-2 md:flex">
        <Link
          href="/"
          title="NowBuild"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-transform hover:scale-105"
        >
          <LogoMark className="h-5 w-12 text-canvas" />
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
                  title={
                    item.key === 'publisher' && extensionNeedsUpdate
                      ? isZh
                        ? '发布插件 · 有新版本'
                        : 'Publishing extension · update available'
                      : item.label
                  }
                  aria-label={item.label}
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    active
                      ? 'bg-white text-black'
                      : `${item.iconTone} hover:brightness-125`
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.key === 'publisher' && extensionNeedsUpdate && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-night" />
                  )}
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
          aria-label={isZh ? '打开市场合伙人' : 'Open Launch Partner'}
        >
          <NavIcon name="agent" className="h-4 w-4" />
          {panelNotifications.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-night bg-amber-300 px-0.5 text-[8px] font-bold text-black">
              {panelNotifications.length > 9 ? '9+' : panelNotifications.length}
            </span>
          ) : (panelBusy || pendingCount > 0) && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-night bg-emerald-400" />
          )}
        </button>
      </header>

      {navigationMenu}

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 gap-2 p-2 md:pl-2">
        {/* 左侧执行工作台 */}
        <main
          onMouseUp={captureWorkspaceSelection}
          onKeyUp={captureWorkspaceSelection}
          className="agent-workspace min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/45 text-zinc-200 shadow-2xl backdrop-blur-sm"
        >
          <div className="h-full overflow-y-auto">{children}</div>
        </main>

        {/* 桌面端常驻 Agent；收起后保留状态轨道。 */}
        <AgentPanelView
          messages={panelMessages}
          notifications={panelNotifications}
          input={input}
          onInput={setInput}
          onSend={handleSend}
          onSubmitOptions={submitOptions}
          onSubmitKickoff={submitKickoff}
          onReadNotification={markAgentNotificationRead}
          sending={sending}
          busy={panelBusy}
          pendingCount={pendingCount}
          workspaceStatus={workspaceStatus}
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
        <div className="fixed inset-0 z-40 bg-black p-2 md:hidden">
          <AgentPanelView
            messages={panelMessages}
            notifications={panelNotifications}
            input={input}
            onInput={setInput}
            onSend={handleSend}
            onSubmitOptions={submitOptions}
            onSubmitKickoff={submitKickoff}
            onReadNotification={markAgentNotificationRead}
            sending={sending}
            busy={panelBusy}
            pendingCount={pendingCount}
            workspaceStatus={workspaceStatus}
            viewContext={resolvedViewContext}
            onClearViewContext={viewContext ? clearViewContext : undefined}
            onToggleCollapsed={() => setMobileAgentOpen(false)}
            isZh={isZh}
            className="w-full"
          />
        </div>
      )}

      {/* 未支付：日历页透明遮罩仅预览，点击打开付费墙；其他页面全屏遮挡。 */}
      {locked && (
        <button
          type="button"
          aria-label={isZh ? '解锁' : 'Unlock'}
          onClick={() => setPaywallOpen(true)}
          className={`absolute inset-0 z-50 block w-full cursor-pointer ${
            restrictedUnpaidView ? 'bg-night' : 'bg-transparent'
          }`}
        />
      )}

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <CampaignBootstrap />
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

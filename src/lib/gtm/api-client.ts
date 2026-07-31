/** 前端调用 Agent API 的薄封装 */

import type {
  ChannelChatResponse,
  ChannelRecommendationResponse,
  ChannelTodosResponse,
  ChannelWriteResponse,
  ChatMessage,
  ContextResponse,
  DirectorAction,
  DirectorResponse,
  DirectoryLaunchKit,
  DirectoryMaterialKey,
  GtmStore,
  StrategyResponse,
  Todo,
} from './types';
import { buildPerformanceContext } from './post-metrics';
import type { ViewContext } from './view-context';
import type { ProductResearchResult } from '@/lib/agents/researcher';
import type { WeeklyReflectionResult } from '@/lib/agents/reflection';
import type { TopicPlanResponse } from '@/lib/agents/topic-planner';
import { buildAgentContextEnvelope } from './agent-context';

async function post<T>(
  url: string,
  body: unknown,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function callDirector(input: {
  message: string;
  history: ChatMessage[];
  store: GtmStore;
  locale: string;
  viewContext?: ViewContext;
  signal?: AbortSignal;
}): Promise<DirectorResponse> {
  return post(
    '/api/agents/director',
    {
      message: input.message,
      history: input.history,
      userProfileDoc: input.store.userProfileDoc,
      projectProfileDoc: input.store.projectProfileDoc,
      conversationSummary: input.store.conversationSummary,
      memoryFacts: input.store.memoryFacts,
      hasStrategy: Boolean(input.store.strategy),
      hasTodos: input.store.todos.length > 0,
      hasChannelRecommendations: Boolean(
        input.store.launch?.channelRecommendations
      ),
      selectedChannelIds: input.store.launch?.selectedChannelIds ?? [],
      channels: input.store.channels,
      todos: input.store.todos.map((t) => ({
        id: t.id,
        date: t.date,
        time: t.time,
        title: t.title,
        channelName: t.channelName,
        status: t.status,
      })),
      performanceContext: buildPerformanceContext(input.store.todos),
      viewContext: input.viewContext,
      campaignContext: buildAgentContextEnvelope(input.store, {
        viewContext: input.viewContext,
      }),
      locale: input.locale,
    },
    { signal: input.signal }
  );
}

export function callStrategist(input: {
  channelIds: string[];
  store: GtmStore;
  feedback?: string;
  locale: string;
  phase?: 'blueprint' | 'channel' | 'full';
  existingOverview?: string;
}): Promise<StrategyResponse> {
  const digest = input.store.directorChat
    .slice(-14)
    .map((m) => `${m.role === 'user' ? '用户' : '市场总监'}：${m.content.slice(0, 200)}`)
    .join('\n');
  return post('/api/agents/strategy', {
    channelIds: input.channelIds,
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    conversationDigest: digest,
    feedback: input.feedback,
    performanceContext: buildPerformanceContext(input.store.todos),
    existingOverview:
      input.existingOverview ?? input.store.strategy?.overviewMarkdown,
    campaignContext: buildAgentContextEnvelope(input.store),
    locale: input.locale,
    phase: input.phase ?? 'full',
  });
}

export function callContextAgent(input: {
  recentMessages: ChatMessage[];
  store: GtmStore;
  locale: string;
}): Promise<ContextResponse> {
  return post('/api/agents/context', {
    recentMessages: input.recentMessages,
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    conversationSummary: input.store.conversationSummary,
    memoryFacts: input.store.memoryFacts,
    campaignContext: buildAgentContextEnvelope(input.store),
    locale: input.locale,
  });
}

export function callChannelRecommender(input: {
  store: GtmStore;
  locale: string;
  feedback?: string;
}): Promise<ChannelRecommendationResponse> {
  const digest = input.store.directorChat
    .slice(-14)
    .map((m) => `${m.role === 'user' ? '用户' : '合伙人'}：${m.content.slice(0, 200)}`)
    .join('\n');
  return post('/api/agents/channel-recommendations', {
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    conversationDigest: digest,
    campaignContext: buildAgentContextEnvelope(input.store),
    locale: input.locale,
    feedback: input.feedback,
  });
}

export function callChannelTodos(input: {
  channelId: string;
  store: GtmStore;
  locale: string;
  /** 策略刚生成、React 状态尚未刷新时的最新文档 */
  strategyMarkdownOverride?: string;
}): Promise<ChannelTodosResponse> {
  return post('/api/agents/channel-todos', {
    channelId: input.channelId,
    channelStrategyMarkdown:
      input.strategyMarkdownOverride ??
      input.store.channelStrategies[input.channelId]?.markdown ??
      '',
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    campaignContext: buildAgentContextEnvelope(input.store, {
      channelId: input.channelId,
    }),
    locale: input.locale,
  });
}

export function callChannelWrite(input: {
  todo: Todo;
  store: GtmStore;
  locale: string;
}): Promise<ChannelWriteResponse> {
  return post('/api/agents/channel-write', {
    todo: {
      channelId: input.todo.channelId,
      title: input.todo.title,
      brief: input.todo.brief,
      dayIndex: input.todo.dayIndex,
      phase: input.todo.phase,
      market: input.todo.market,
      audience: input.todo.audience,
      purpose: input.todo.purpose,
      pillar: input.todo.pillar,
      taskType: input.todo.taskType,
    },
    channelStrategyMarkdown:
      input.store.channelStrategies[input.todo.channelId]?.markdown ?? '',
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    campaignContext: buildAgentContextEnvelope(input.store, {
      channelId: input.todo.channelId,
      todoId: input.todo.id,
    }),
    locale: input.locale,
  });
}

export function callDirectoryMaterialGeneration(input: {
  store: GtmStore;
  requestedFields: DirectoryMaterialKey[];
  locale: string;
}): Promise<
  Partial<
    Pick<
      DirectoryLaunchKit,
      | 'tagline'
      | 'shortDescription'
      | 'longDescription'
      | 'categories'
      | 'tags'
    >
  >
> {
  const launch = input.store.launch;
  if (!launch) return Promise.resolve({});
  return post('/api/agents/directory-materials', {
    productName: launch.project.productName,
    productUrl: launch.project.productUrl,
    productSummary: launch.brief?.product.summary ?? '',
    positioning: launch.brief?.positioning.statement ?? '',
    sellingPoints: launch.brief?.positioning.sellingPoints ?? [],
    pricing: launch.brief?.product.pricing ?? '',
    sourceMarkdown: launch.brief?.sourceMarkdown ?? '',
    requestedFields: input.requestedFields,
    locale: (input.store.targetMarketLocale ?? input.locale) === 'zh' ? 'zh' : 'en',
  });
}

export function callChannelChat(input: {
  todo: Todo;
  history: ChatMessage[];
  message: string;
  store: GtmStore;
  locale: string;
}): Promise<ChannelChatResponse> {
  const channelTodos = input.store.todos.filter(
    (t) => t.channelId === input.todo.channelId
  );
  return post('/api/agents/channel-chat', {
    todo: {
      id: input.todo.id,
      channelId: input.todo.channelId,
      title: input.todo.title,
      brief: input.todo.brief,
      dayIndex: input.todo.dayIndex,
      phase: input.todo.phase,
    },
    currentContent: input.todo.content,
    history: input.history,
    message: input.message,
    channelStrategyMarkdown:
      input.store.channelStrategies[input.todo.channelId]?.markdown ?? '',
    channelTodosDigest: channelTodos
      .map((t) => `Day ${t.dayIndex}: ${t.title} — ${t.brief}`)
      .join('\n'),
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    campaignContext: buildAgentContextEnvelope(input.store, {
      channelId: input.todo.channelId,
      todoId: input.todo.id,
    }),
    locale: input.locale,
  });
}

export function callProductResearch(input: {
  websiteUrl: string;
  locale: string;
}): Promise<ProductResearchResult> {
  return post('/api/agents/research', input);
}

export function callWeeklyReflection(input: {
  store: GtmStore;
  locale: string;
}): Promise<WeeklyReflectionResult> {
  return post('/api/agents/reflection', {
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    strategyMarkdown: input.store.strategy?.overviewMarkdown ?? '',
    performanceContext: buildPerformanceContext(input.store.todos),
    campaignContext: buildAgentContextEnvelope(input.store),
    locale: input.locale,
  });
}

export function callLaunchPatch(input: {
  entityType: 'brief' | 'blueprint' | 'channel_plan' | 'calendar';
  current: unknown;
  instruction: string;
  campaignContext: string;
  baseRevision: number;
  channelId?: string;
  locale: string;
  editToken?: string;
}): Promise<{
  updated: unknown;
  summary: string;
  impact: 'local' | 'week' | 'channel' | 'global';
  baseRevision: number;
  briefEditUsed?: number;
  briefEditRemaining?: number;
}> {
  return post('/api/agents/launch-patch', input);
}

export function callTopicPlanner(input: {
  channelIds: string[];
  count: number;
  store: GtmStore;
  locale: string;
}): Promise<TopicPlanResponse> {
  return post('/api/agents/topics', {
    channelIds: input.channelIds,
    count: input.count,
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    strategyMarkdown: input.store.strategy?.overviewMarkdown ?? '',
    channelStrategyMarkdown: Object.fromEntries(
      input.channelIds.map((channelId) => [
        channelId,
        input.store.channelStrategies[channelId]?.markdown ?? '',
      ])
    ),
    performanceContext: buildPerformanceContext(input.store.todos),
    campaignContext: buildAgentContextEnvelope(input.store),
    locale: input.locale,
  });
}

export async function enqueueChannelPlans(input: {
  channelIds: string[];
  store: GtmStore;
  locale: string;
  taskMessageId: string;
  force?: boolean;
}): Promise<{
  job: {
    id: string;
    status: string;
    progress_completed: number;
    progress_total: number;
    last_error: string | null;
  } | null;
  steps: unknown[];
  skipped?: boolean;
  resumed?: boolean;
  channelIds?: string[];
  reason?: string;
  error?: string;
}> {
  const res = await fetch('/api/agents/channel-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelIds: input.channelIds,
      store: input.store,
      locale: input.locale,
      taskMessageId: input.taskMessageId,
      force: input.force === true,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    job?: {
      id: string;
      status: string;
      progress_completed: number;
      progress_total: number;
      last_error: string | null;
    } | null;
    steps?: unknown[];
    skipped?: boolean;
    resumed?: boolean;
    channelIds?: string[];
    reason?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return {
    job: data.job ?? null,
    steps: data.steps ?? [],
    skipped: data.skipped,
    resumed: data.resumed,
    channelIds: data.channelIds,
    reason: data.reason,
  };
}

export async function pollChannelPlans(jobId?: string): Promise<{
  job: {
    id: string;
    status: string;
    progress_completed: number;
    progress_total: number;
    last_error: string | null;
  } | null;
  steps: unknown[];
}> {
  const url = jobId
    ? `/api/agents/channel-plans?jobId=${encodeURIComponent(jobId)}`
    : '/api/agents/channel-plans';
  const res = await fetch(url, { cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as {
    job?: {
      id: string;
      status: string;
      progress_completed: number;
      progress_total: number;
      last_error: string | null;
    } | null;
    steps?: unknown[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return { job: data.job ?? null, steps: data.steps ?? [] };
}

export async function enqueueAgentWork(input: {
  actions: DirectorAction[];
  store: GtmStore;
  locale: string;
  taskMessageId: string;
  label?: string;
  buildKey?: string;
}): Promise<{
  job: {
    id: string;
    status: string;
    progress_completed: number;
    progress_total: number;
    last_error: string | null;
  } | null;
  steps: unknown[];
  skipped?: boolean;
  resumed?: boolean;
  error?: string;
}> {
  const res = await fetch('/api/agents/work', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actions: input.actions,
      store: input.store,
      locale: input.locale,
      taskMessageId: input.taskMessageId,
      label: input.label,
      buildKey: input.buildKey,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    job?: {
      id: string;
      status: string;
      progress_completed: number;
      progress_total: number;
      last_error: string | null;
    } | null;
    steps?: unknown[];
    skipped?: boolean;
    resumed?: boolean;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return {
    job: data.job ?? null,
    steps: data.steps ?? [],
    skipped: data.skipped,
    resumed: data.resumed,
  };
}

export async function pollAgentWork(jobId?: string): Promise<{
  job: {
    id: string;
    status: string;
    progress_completed: number;
    progress_total: number;
    last_error: string | null;
  } | null;
  steps: unknown[];
}> {
  const url = jobId
    ? `/api/agents/work?jobId=${encodeURIComponent(jobId)}`
    : '/api/agents/work';
  const res = await fetch(url, { cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as {
    job?: {
      id: string;
      status: string;
      progress_completed: number;
      progress_total: number;
      last_error: string | null;
    } | null;
    steps?: unknown[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return { job: data.job ?? null, steps: data.steps ?? [] };
}

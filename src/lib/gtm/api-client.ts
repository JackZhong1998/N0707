/** 前端调用 Agent API 的薄封装 */

import type {
  ChannelChatResponse,
  ChannelTodosResponse,
  ChannelWriteResponse,
  ChatMessage,
  ContextResponse,
  DirectorResponse,
  GtmStore,
  StrategyResponse,
  Todo,
} from './types';
import { buildPerformanceContext } from './post-metrics';
import type { ViewContext } from './view-context';
import type { ProductResearchResult } from '@/lib/agents/researcher';
import type { WeeklyReflectionResult } from '@/lib/agents/reflection';
import type { TopicPlanResponse } from '@/lib/agents/topic-planner';

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
    existingOverview: input.store.strategy?.overviewMarkdown,
    locale: input.locale,
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
    locale: input.locale,
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
    },
    channelStrategyMarkdown:
      input.store.channelStrategies[input.todo.channelId]?.markdown ?? '',
    userProfileDoc: input.store.userProfileDoc,
    projectProfileDoc: input.store.projectProfileDoc,
    locale: input.locale,
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
    locale: input.locale,
  });
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
    locale: input.locale,
  });
}

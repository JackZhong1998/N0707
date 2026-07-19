'use client';

/**
 * 市场总监对话编排 Hook
 *
 * - 发送消息给市场总监，处理回复与选项卡片
 * - 执行总监派发的后台任务（策略生成 / 渠道专员编写 To-Do），
 *   以进度卡片呈现，完成后插入可点击的策略卡片 / 日历卡片
 * - 每积累若干消息调用一次上下文管理 Agent，累积两份档案
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from './store';
import {
  callChannelChat,
  callChannelTodos,
  callChannelWrite,
  callContextAgent,
  callDirector,
  callProductResearch,
  callStrategist,
  callTopicPlanner,
  callWeeklyReflection,
} from './api-client';
import { addDays, parseDateStr, todayStr } from './dates';
import { formatKickoffAnswers } from './kickoff';
import {
  CONTEXT_SYNC_INTERVAL,
  type ChatMessage,
  type DirectorAction,
  type GtmStore,
  type KickoffCard,
  type OptionCard,
  type Todo,
} from './types';
import type { ViewContext } from './view-context';

const MESSAGE_COALESCE_MS = 800;
const MAX_BATCH_MESSAGES = 8;
const MAX_BATCH_CHARACTERS = 12_000;

export interface DirectorSendMeta {
  fromOptionCard?: boolean;
  selectedIds?: string[];
  /** 用户在「策略确认卡」里选择了确认 */
  confirmStrategy?: boolean;
  /** Overrides the view captured by useDirector(defaultViewContext). */
  viewContext?: ViewContext;
}

interface QueuedDirectorMessage {
  id: string;
  text: string;
  meta?: DirectorSendMeta;
  viewContext?: ViewContext;
}

function combineQueuedMessages(batch: QueuedDirectorMessage[]): string {
  if (batch.length === 1) return batch[0].text;
  return [
    `用户在同一轮连续发送了 ${batch.length} 条消息。请把它们作为按顺序补充的同一个请求来理解：`,
    ...batch.map((item, index) => `[${index + 1}/${batch.length}] ${item.text}`),
  ].join('\n\n');
}

function contextFingerprint(context?: ViewContext): string {
  if (!context) return '';
  return JSON.stringify([
    context.view,
    context.entityType,
    context.entityId,
    context.channelId,
    context.section,
    context.revision,
  ]);
}

function enrichViewContext(
  context: ViewContext | undefined,
  store: GtmStore
): ViewContext | undefined {
  if (!context || context.selectedText) return context;

  let detail = '';
  if (context.entityType === 'artifact' && context.entityId) {
    const artifact = store.artifacts.find(
      (item) => item.id === context.entityId
    );
    if (artifact) {
      const proposals = Array.isArray(artifact.metadata?.proposals)
        ? `待确认调整：\n${JSON.stringify(artifact.metadata.proposals, null, 2)}`
        : '';
      detail = [proposals, artifact.markdown].filter(Boolean).join('\n\n');
    }
  } else if (context.entityType === 'todo' && context.entityId) {
    const todo = store.todos.find((item) => item.id === context.entityId);
    if (todo) {
      detail = [
        `任务：${todo.title}`,
        `Brief：${todo.brief}`,
        todo.content
          ? `当前内容标题：${todo.content.title}\n当前正文：${todo.content.body}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
  } else if (context.entityType === 'topic' && context.entityId) {
    const topic = store.topics.find((item) => item.id === context.entityId);
    if (topic) {
      detail = [
        `选题：${topic.title}`,
        `目标人群：${topic.targetAudience}`,
        `痛点：${topic.painPoint}`,
        `核心观点：${topic.corePoint}`,
      ].join('\n');
    }
  } else if (context.entityType === 'topic_variant' && context.entityId) {
    const variant = store.topicVariants.find(
      (item) => item.id === context.entityId
    );
    const topic = variant
      ? store.topics.find((item) => item.id === variant.topicId)
      : undefined;
    if (variant) {
      detail = [
        topic ? `核心选题：${topic.title}` : '',
        `渠道：${variant.channelName}`,
        `Hook：${variant.hook}`,
        `角度：${variant.angle}`,
        `形式：${variant.format}`,
        `CTA：${variant.cta}`,
      ]
        .filter(Boolean)
        .join('\n');
    }
  } else if (
    context.entityType === 'channel_strategy' &&
    context.channelId
  ) {
    detail = store.channelStrategies[context.channelId]?.markdown ?? '';
  } else if (context.entityType === 'strategy') {
    detail = store.strategy?.overviewMarkdown ?? '';
  }

  return detail
    ? { ...context, selectedText: detail.slice(0, 2_000) }
    : context;
}

function takeMailboxBatch(
  mailbox: QueuedDirectorMessage[]
): QueuedDirectorMessage[] {
  const batch: QueuedDirectorMessage[] = [];
  const fingerprint = contextFingerprint(mailbox[0]?.viewContext);
  let characters = 0;

  while (mailbox.length > 0 && batch.length < MAX_BATCH_MESSAGES) {
    const candidate = mailbox[0];
    if (
      batch.length > 0 &&
      contextFingerprint(candidate.viewContext) !== fingerprint
    ) {
      break;
    }
    if (
      batch.length > 0 &&
      characters + candidate.text.length > MAX_BATCH_CHARACTERS
    ) {
      break;
    }
    batch.push(mailbox.shift()!);
    characters += candidate.text.length;
  }
  return batch;
}

function isStopCommand(text: string): boolean {
  return /^(?:stop|cancel|停止|取消|停一下|先停|别做了)[.!！。]?$/i.test(
    text.trim()
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withResearchSection(existing: string, research: string): string {
  const start = '<!-- nowbuild:research:start -->';
  const end = '<!-- nowbuild:research:end -->';
  const block = `${start}\n${research.trim()}\n${end}`;
  const expression = new RegExp(
    `${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )}`,
    'm'
  );
  const current = existing.trim();
  return expression.test(current)
    ? current.replace(expression, block)
    : [current, block].filter(Boolean).join('\n\n');
}

export function useDirector(defaultViewContext?: ViewContext) {
  const gtm = useGtm();
  const locale = useLocale();
  const [processing, setProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [backgroundTasks, setBackgroundTasks] = useState<string[]>([]);
  const mailboxRef = useRef<QueuedDirectorMessage[]>([]);
  const processingRef = useRef(false);
  const processorRef = useRef<() => Promise<void>>(async () => undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelEpochRef = useRef(0);
  const publisherTailRef = useRef<Promise<void>>(Promise.resolve());
  const actionTailRef = useRef<Promise<void>>(Promise.resolve());
  const contextSyncRunningRef = useRef(false);
  const scheduledActionJobIdsRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  // store 的最新引用（后台任务链中避免闭包读到旧值）
  const storeRef = useRef<GtmStore>(gtm.store);
  storeRef.current = gtm.store;
  // React 状态落盘前的同步缓存：策略生成后立即派发 To-Do 时使用
  const freshStrategiesRef = useRef<Record<string, { markdown: string; name: string }>>({});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      mailboxRef.current = [];
    };
  }, []);

  // Authenticated state and local cache both persist the inbox. If the page was
  // refreshed while requests were waiting, restore them into the in-memory
  // processor without duplicating the already-visible user messages.
  useEffect(() => {
    if (
      !gtm.hydrated ||
      processingRef.current ||
      mailboxRef.current.length > 0 ||
      gtm.store.pendingAgentRequests.length === 0
    ) {
      return;
    }
    mailboxRef.current = gtm.store.pendingAgentRequests.map((request) => ({
      id: request.messageId,
      text: request.text,
      meta: request.meta,
      viewContext: request.context,
    }));
    setPendingCount(mailboxRef.current.length);
    void processorRef.current();
  }, [gtm.hydrated, gtm.store.pendingAgentRequests]);

  /**
   * Every assistant event goes through one publisher, including results emitted
   * by background workers. This prevents separate async branches from writing
   * to the visible conversation at the same instant.
   */
  const publishDirectorMessage = useCallback(
    (message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> => {
      let created: ChatMessage | undefined;
      const publish = publisherTailRef.current
        .catch(() => undefined)
        .then(() => {
          created = gtm.addDirectorMessage(message);
        });
      publisherTailRef.current = publish;
      return publish.then(() => created as ChatMessage);
    },
    [gtm]
  );

  const syncContext = useCallback(async () => {
    const store = storeRef.current;
    if (
      contextSyncRunningRef.current ||
      store.msgSinceContextSync < CONTEXT_SYNC_INTERVAL
    ) {
      return;
    }
    const processedMessageCount = Math.min(
      store.msgSinceContextSync,
      38
    );
    const firstUnprocessedIndex = Math.max(
      0,
      store.directorChat.length - store.msgSinceContextSync
    );
    let syncSucceeded = false;
    contextSyncRunningRef.current = true;
    try {
      const recent = store.directorChat.slice(
        Math.max(0, firstUnprocessedIndex - 2),
        firstUnprocessedIndex + processedMessageCount
      );
      const res = await callContextAgent({ recentMessages: recent, store, locale });
      gtm.setProfiles(res.userProfileDoc, res.projectProfileDoc);
      gtm.setMemoryState(
        res.conversationSummary,
        res.memoryFacts,
        processedMessageCount
      );
      syncSucceeded = true;
    } catch {
      // 档案总结失败不阻塞主流程
    } finally {
      contextSyncRunningRef.current = false;
      if (
        syncSucceeded &&
        mountedRef.current &&
        storeRef.current.msgSinceContextSync >= CONTEXT_SYNC_INTERVAL
      ) {
        window.setTimeout(() => void syncContext(), 100);
      }
    }
  }, [gtm, locale]);

  const runGenerateStrategy = useCallback(
    async (
      channelIds: string[],
      feedback?: string,
      options?: { skipConfirmation?: boolean }
    ) => {
      const taskId = `strategy-${Date.now()}`;
      setBackgroundTasks((t) => [...t, taskId]);
      const cardMsg = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: { kind: 'agent-task', label: '策略生成 Agent 正在编写市场策略…', status: 'running' },
      });
      try {
        const res = await callStrategist({
          channelIds,
          store: storeRef.current,
          feedback,
          locale,
        });
        gtm.setStrategy({
          overviewMarkdown: res.overviewMarkdown,
          goal: res.goal,
          updatedAt: Date.now(),
        });
        for (const c of res.channels) {
          freshStrategiesRef.current[c.channelId] = {
            markdown: c.markdown,
            name: c.channelName,
          };
          gtm.upsertChannelStrategy({
            channelId: c.channelId,
            channelName: c.channelName,
            positioning: c.positioning,
            direction: c.direction,
            contentPillars: c.contentPillars,
            markdown: c.markdown,
            updatedAt: Date.now(),
          });
        }
        gtm.patchDirectorMessage(cardMsg.id, {
          card: { kind: 'agent-task', label: '市场策略已生成', status: 'done' },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content: '',
          card: {
            kind: 'strategy',
            title: '30 天冷启动市场策略',
            channelIds: res.channels.map((c) => c.channelId),
          },
        });

        const isZh = locale !== 'en';
        const channelSummary = res.channels
          .map(
            (c) =>
              `**${c.channelName}**\n- ${isZh ? '定位' : 'Positioning'}：${c.positioning}\n- ${isZh ? '主打内容' : 'Pillars'}：${c.contentPillars.slice(0, 3).join(' / ')}`
          )
          .join('\n\n');
        if (options?.skipConfirmation) {
          await publishDirectorMessage({
            role: 'assistant',
            content: isZh
              ? `我已经把最新帖子表现写进策略，调整后的渠道方向是：\n\n${channelSummary}\n\n接下来只会重排尚未发布的任务，已发布帖子和历史数据都会保留。`
              : `I incorporated the latest post performance into the strategy:\n\n${channelSummary}\n\nOnly future unpublished tasks will be replanned; published history remains intact.`,
          });
        } else {
          await publishDirectorMessage({
            role: 'assistant',
            content: isZh
              ? `策略出来了，先给你划一下每个渠道的关键打法：\n\n${channelSummary}\n\n完整文档在「市场策略」页，可以点上面的卡片细看。**你先过一遍** — 哪里不对味直接告诉我（比如「小红书想更偏个人故事」），我让策略组改；方向没问题的话，我就安排各渠道把 30 天每日 To-Do 排进你的行动日历。`
              : `Strategy is ready. Here are the key plays per channel:\n\n${channelSummary}\n\nFull docs live on the Strategy page (tap the card above). **Review it first** — tell me anything that feels off and I'll have it revised; if it looks right, I'll schedule your 30-day daily to-dos.`,
            card: {
              kind: 'options',
              card: {
                question: isZh ? '这份策略方向可以吗？' : 'Happy with this direction?',
                multi: false,
                options: [
                  {
                    id: 'confirm_strategy',
                    label: isZh ? '确认，开始排 30 天 To-Do' : 'Confirm — schedule my 30 days',
                  },
                  {
                    id: 'adjust_strategy',
                    label: isZh ? '我要调整（在下方说明想改哪里）' : 'I want changes (tell me below)',
                  },
                ],
                allowCustom: true,
              },
            },
          });
        }
        return true;
      } catch (err) {
        gtm.patchDirectorMessage(cardMsg.id, {
          card: {
            kind: 'agent-task',
            label: `策略生成失败：${err instanceof Error ? err.message : '未知错误'}`,
            status: 'error',
          },
        });
        return false;
      } finally {
        setBackgroundTasks((t) => t.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runGenerateTodos = useCallback(
    async (
      channelIds: string[],
      options?: { preservePublished?: boolean }
    ) => {
      const taskId = `todos-${Date.now()}`;
      setBackgroundTasks((t) => [...t, taskId]);
      const startDate = storeRef.current.startDate ?? todayStr();
      if (!storeRef.current.startDate) {
        gtm.update({ startDate });
      }
      const cardMsg = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: `渠道专员正在编写 30 天 To-Do（${channelIds.length} 个渠道）…`,
          status: 'running',
        },
      });
      try {
        await Promise.all(
          channelIds.map(async (channelId) => {
            const res = await callChannelTodos({
              channelId,
              store: storeRef.current,
              locale,
              strategyMarkdownOverride: freshStrategiesRef.current[channelId]?.markdown,
            });
            const channelDoc = storeRef.current.channelStrategies[channelId];
            const todos: Todo[] = res.todos.map((t, i) => ({
              id: `${channelId}-${t.dayIndex}-${i}-${Date.now()}`,
              channelId,
              channelName:
                channelDoc?.channelName ??
                freshStrategiesRef.current[channelId]?.name ??
                channelId,
              dayIndex: t.dayIndex,
              date: addDays(startDate, t.dayIndex - 1),
              time: t.time,
              title: t.title,
              brief: t.brief,
              phase: t.phase,
              market: t.market,
              audience: t.audience,
              status: 'pending',
              contentStatus: 'none',
            }));
            const preserved = options?.preservePublished
              ? storeRef.current.todos.filter(
                  (todo) => todo.channelId === channelId && todo.publishedUrl
                )
              : [];
            const publishedDays = new Set(preserved.map((todo) => todo.dayIndex));
            gtm.replaceChannelTodos(channelId, [
              ...preserved,
              ...todos.filter((todo) => !publishedDays.has(todo.dayIndex)),
            ]);
          })
        );
        gtm.update({ planReady: true });
        gtm.patchDirectorMessage(cardMsg.id, {
          card: { kind: 'agent-task', label: '30 天 To-Do 已排入日历', status: 'done' },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content: '',
          card: { kind: 'calendar', title: '你的 30 天行动日历已就绪' },
        });
      } catch (err) {
        gtm.patchDirectorMessage(cardMsg.id, {
          card: {
            kind: 'agent-task',
            label: `To-Do 编写失败：${err instanceof Error ? err.message : '未知错误'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((t) => t.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runGenerateTopics = useCallback(
    async (channelIds: string[], count = 7, agentJobId?: string) => {
      if (
        agentJobId &&
        storeRef.current.artifacts.some(
          (artifact) => artifact.metadata?.agentJobId === agentJobId
        )
      ) {
        return;
      }
      const ids = channelIds.length > 0 ? channelIds : storeRef.current.channels;
      if (ids.length === 0) return;
      const taskId = `topics-${Date.now()}`;
      setBackgroundTasks((tasks) => [...tasks, taskId]);
      const cardMessage = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: `选题规划正在生成 ${count} 个核心选题…`,
          status: 'running',
        },
      });
      try {
        const result = await callTopicPlanner({
          channelIds: ids,
          count,
          store: storeRef.current,
          locale,
        });
        for (const planned of result.topics) {
          const topic = gtm.createTopic({
            title: planned.title,
            source: planned.source,
            targetAudience: planned.targetAudience,
            painPoint: planned.painPoint,
            corePoint: planned.corePoint,
            priority: planned.priority,
            status: planned.status,
          });
          for (const variant of planned.variants) {
            gtm.createTopicVariant({ ...variant, topicId: topic.id });
          }
        }
        const artifact = gtm.createArtifact({
          kind: 'topic_plan',
          title: result.title || '7 天选题计划',
          summary: result.summary,
          markdown: result.markdown,
          status: 'draft',
          metadata: {
            channelIds: ids,
            topicCount: result.topics.length,
            agentJobId,
          },
        });
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: `${result.topics.length} 个核心选题已进入选题库`,
            status: 'done',
          },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content:
            locale !== 'en'
              ? `${result.summary}\n\n完整选题计划已经放到左侧工作区，所有渠道版本也已经进入选题库。`
              : `${result.summary}\n\nThe full plan is in the workspace and every channel variant has been added to the topic library.`,
          card: {
            kind: 'artifact',
            artifactId: artifact.id,
            title: artifact.title,
            summary: artifact.summary,
            status: artifact.status,
          },
        });
      } catch (error) {
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: `选题生成失败：${error instanceof Error ? error.message : '未知错误'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((tasks) => tasks.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runProductResearch = useCallback(
    async (websiteUrl: string, agentJobId?: string) => {
      if (
        agentJobId &&
        storeRef.current.artifacts.some(
          (artifact) => artifact.metadata?.agentJobId === agentJobId
        )
      ) {
        return;
      }
      const taskId = `research-${Date.now()}`;
      setBackgroundTasks((tasks) => [...tasks, taskId]);
      const cardMessage = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: 'Research 正在读取产品官网并搜索竞品…',
          status: 'running',
        },
      });
      try {
        const result = await callProductResearch({ websiteUrl, locale });
        const competitorDigest = result.competitors
          .map(
            (competitor) =>
              `- [${competitor.name}](${competitor.url})：${competitor.reason}`
          )
          .join('\n');
        const researchProfile = `# ${
          locale !== 'en' ? '官网研究更新' : 'Website research update'
        }\n\n${result.productProfileMarkdown}\n\n## ${
          locale !== 'en' ? '主要竞品对比' : 'Primary competitors'
        }\n\n${competitorDigest || (locale !== 'en' ? '暂未确认直接竞品。' : 'No direct competitor confirmed yet.')}`;
        gtm.setProfiles(
          storeRef.current.userProfileDoc,
          withResearchSection(
            storeRef.current.projectProfileDoc,
            researchProfile
          )
        );
        const artifact = gtm.createArtifact({
          kind: 'research_report',
          title: locale !== 'en' ? '产品定位与竞品研究' : 'Product & competitor research',
          summary:
            locale !== 'en'
              ? `已读取官网并分析 ${result.competitors.length} 个主要竞品。`
              : `Website reviewed and ${result.competitors.length} primary competitors analyzed.`,
          markdown: `# ${locale !== 'en' ? '产品定位' : 'Product positioning'}\n\n${
            result.productProfileMarkdown
          }\n\n# ${locale !== 'en' ? '竞品分析' : 'Competitive landscape'}\n\n${
            result.competitorAnalysisMarkdown
          }`,
          status: 'draft',
          metadata: {
            websiteUrl,
            competitors: result.competitors,
            sources: result.sources,
            researchedAt: result.researchedAt,
            agentJobId,
          },
        });
        gtm.addAgentNotification({
          title: artifact.title,
          summary: artifact.summary,
          artifactId: artifact.id,
          priority: 'normal',
        });
        gtm.patchDirectorMessage(cardMessage.id, {
          card: { kind: 'agent-task', label: '产品与竞品研究已完成', status: 'done' },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content:
            locale !== 'en'
              ? '研究已经完成。我把完整来源、产品定位和竞品差异放到了左侧，右侧只保留结论和后续讨论。'
              : 'Research is complete. Sources, positioning, and competitive differences are in the workspace; we can keep the discussion here.',
          card: {
            kind: 'artifact',
            artifactId: artifact.id,
            title: artifact.title,
            summary: artifact.summary,
            status: artifact.status,
          },
        });
      } catch (error) {
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: `Research 失败：${error instanceof Error ? error.message : '未知错误'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((tasks) => tasks.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runWeeklyReview = useCallback(async (options?: {
    silent?: boolean;
    agentJobId?: string;
  }) => {
    if (
      options?.agentJobId &&
      storeRef.current.artifacts.some(
        (artifact) =>
          artifact.metadata?.agentJobId === options.agentJobId
      )
    ) {
      return;
    }
    const taskId = `review-${Date.now()}`;
    setBackgroundTasks((tasks) => [...tasks, taskId]);
    const cardMessage = options?.silent
      ? undefined
      : await publishDirectorMessage({
          role: 'assistant',
          content: '',
          card: {
            kind: 'agent-task',
            label: '正在复盘已发布帖子并准备下周调整草案…',
            status: 'running',
          },
        });
    try {
      const result = await callWeeklyReflection({
        store: storeRef.current,
        locale,
      });
      const artifact = gtm.createArtifact({
        kind: 'weekly_review',
        title: result.headline,
        summary: result.summary,
        markdown: result.reviewMarkdown,
        status: result.proposals.length > 0 ? 'waiting_approval' : 'draft',
        metadata: {
          proposals: result.proposals,
          evidenceSufficient: result.evidenceSufficient,
          generatedAt: result.generatedAt,
          agentJobId: options?.agentJobId,
        },
      });
      gtm.update({ lastReflectionAt: result.generatedAt });
      gtm.addAgentNotification({
        title: result.headline,
        summary: result.summary,
        artifactId: artifact.id,
        priority: result.proposals.length > 0 ? 'important' : 'normal',
      });
      if (cardMessage) {
        gtm.patchDirectorMessage(cardMessage.id, {
          card: { kind: 'agent-task', label: '本周市场复盘已完成', status: 'done' },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content: result.summary,
          card: {
            kind: 'artifact',
            artifactId: artifact.id,
            title: artifact.title,
            summary: artifact.summary,
            status: artifact.status,
          },
        });
      }
    } catch (error) {
      if (cardMessage) {
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: `复盘失败：${error instanceof Error ? error.message : '未知错误'}`,
            status: 'error',
          },
        });
      } else {
        gtm.addAgentNotification({
          title:
            locale !== 'en'
              ? '本周市场复盘暂未完成'
              : 'Weekly review did not finish',
          summary:
            error instanceof Error
              ? error.message
              : locale !== 'en'
                ? '后台复盘遇到问题，可以稍后在对话中重新发起。'
                : 'The background review hit a problem. You can retry it later in chat.',
          priority: 'normal',
        });
      }
    } finally {
      setBackgroundTasks((tasks) => tasks.filter((id) => id !== taskId));
    }
  }, [gtm, locale, publishDirectorMessage]);

  const runRewriteTodoContent = useCallback(
    async (todoId: string, feedback: string) => {
      const todo = storeRef.current.todos.find((item) => item.id === todoId);
      if (!todo) {
        await publishDirectorMessage({
          role: 'assistant',
          content: locale !== 'en' ? '我没有找到当前这条任务。' : 'I could not find that task.',
        });
        return;
      }
      const taskId = `rewrite-${todoId}-${Date.now()}`;
      setBackgroundTasks((tasks) => [...tasks, taskId]);
      const cardMessage = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: `${todo.channelName}内容正在根据你的意见重写…`,
          status: 'running',
        },
      });
      try {
        const result = await callChannelChat({
          todo,
          history: [],
          message: feedback,
          store: storeRef.current,
          locale,
        });
        const content =
          result.rewriteContent ??
          (await callChannelWrite({
            todo: { ...todo, brief: `${todo.brief}\n用户最新意见：${feedback}` },
            store: storeRef.current,
            locale,
          }));
        gtm.updateTodo(todo.id, { content, contentStatus: 'ready' });
        gtm.patchDirectorMessage(cardMessage.id, {
          card: { kind: 'agent-task', label: '内容已更新到左侧', status: 'done' },
        });
      } catch (error) {
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: `内容修改失败：${error instanceof Error ? error.message : '未知错误'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((tasks) => tasks.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runGenerateTodoContent = useCallback(
    async (todoId: string, agentJobId?: string) => {
      const todo = storeRef.current.todos.find((item) => item.id === todoId);
      if (!todo || (todo.contentStatus === 'ready' && todo.content)) return;

      const taskId = `write-${todoId}-${Date.now()}`;
      setBackgroundTasks((tasks) => [...tasks, taskId]);
      gtm.updateTodo(todoId, { contentStatus: 'writing' });
      const cardMessage = await publishDirectorMessage({
        role: 'assistant',
        lane: 'background',
        agentJobId,
        content: '',
        card: {
          kind: 'agent-task',
          label: `${todo.channelName}渠道专员正在撰写内容…`,
          status: 'running',
        },
      });
      try {
        const result = await callChannelWrite({
          todo,
          store: storeRef.current,
          locale,
        });
        const latest = storeRef.current.todos.find(
          (item) => item.id === todoId
        );
        // A user-requested rewrite has priority over this automatic first
        // draft. `none` is allowed here because mock responses can resolve
        // before React has committed the optimistic `writing` update.
        if (!latest || (latest.contentStatus === 'ready' && latest.content)) {
          return;
        }
        gtm.updateTodo(todoId, {
          content: result,
          contentStatus: 'ready',
        });
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: '可发布内容已写入左侧任务',
            status: 'done',
          },
        });
      } catch (error) {
        const latest = storeRef.current.todos.find(
          (item) => item.id === todoId
        );
        if (latest?.contentStatus === 'writing') {
          gtm.updateTodo(todoId, { contentStatus: 'none' });
        }
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: `内容生成失败：${error instanceof Error ? error.message : '未知错误'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((tasks) =>
          tasks.filter((id) => id !== taskId)
        );
      }
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runScheduleTopicVariant = useCallback(
    async (
      topicVariantId: string,
      requestedDate: string,
      requestedTime?: string,
      agentJobId?: string
    ) => {
      const variant = storeRef.current.topicVariants.find(
        (item) => item.id === topicVariantId
      );
      const topic = variant
        ? storeRef.current.topics.find((item) => item.id === variant.topicId)
        : undefined;
      if (!variant || !topic) {
        await publishDirectorMessage({
          role: 'assistant',
          lane: 'background',
          agentJobId,
          content:
            locale !== 'en'
              ? '我没有找到这个选题版本，可能它刚刚被删除了。'
              : 'I could not find that topic variant. It may have been deleted.',
        });
        return;
      }

      const date =
        /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
        addDays(requestedDate, 0) === requestedDate
          ? requestedDate
          : todayStr();
      const time =
        requestedTime && /^\d{2}:\d{2}$/.test(requestedTime)
          ? requestedTime
          : '09:00';
      const existing = storeRef.current.todos.find(
        (todo) =>
          todo.topicVariantId === topicVariantId && todo.date === date
      );
      if (existing) {
        await publishDirectorMessage({
          role: 'assistant',
          lane: 'background',
          agentJobId,
          content:
            locale !== 'en'
              ? `这个选题已经安排在 ${date} ${existing.time ?? ''}，我没有重复创建。`
              : `This topic is already scheduled for ${date} ${existing.time ?? ''}, so I did not duplicate it.`,
          card: { kind: 'calendar', title: '已安排的选题任务' },
        });
        return;
      }

      const startDate = storeRef.current.startDate ?? todayStr();
      if (!storeRef.current.startDate) {
        gtm.update({ startDate });
      }
      const oneDay = 24 * 60 * 60 * 1_000;
      const dayIndex = Math.max(
        1,
        Math.round(
          (parseDateStr(date).getTime() - parseDateStr(startDate).getTime()) /
            oneDay
        ) + 1
      );
      const brief = [
        `核心选题：${topic.title}`,
        topic.targetAudience ? `目标人群：${topic.targetAudience}` : '',
        topic.painPoint ? `痛点：${topic.painPoint}` : '',
        topic.corePoint ? `核心观点：${topic.corePoint}` : '',
        variant.hook ? `Hook：${variant.hook}` : '',
        variant.angle ? `切入角度：${variant.angle}` : '',
        variant.format ? `内容形式：${variant.format}` : '',
        variant.cta ? `CTA：${variant.cta}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const todo = gtm.createTodo({
        topicVariantId,
        channelId: variant.channelId,
        channelName: variant.channelName,
        dayIndex,
        date,
        time,
        title: topic.title,
        brief,
        status: 'pending',
        contentStatus: 'none',
      });
      gtm.updateTopicVariant(topicVariantId, { status: 'scheduled' });
      gtm.updateTopic(topic.id, { status: 'scheduled' });
      await publishDirectorMessage({
        role: 'assistant',
        lane: 'background',
        agentJobId,
        content:
          locale !== 'en'
            ? `已经把「${topic.title}」的 ${variant.channelName} 版本安排到 ${date} ${time}。打开任务后，渠道专员会按这个选题写出可发布内容。`
            : `Scheduled the ${variant.channelName} version of “${topic.title}” for ${date} at ${time}. Opening the task will generate the publish-ready draft.`,
        card: {
          kind: 'calendar',
          title:
            locale !== 'en'
              ? `选题已进入行动日历 · ${todo.date}`
              : `Topic added to calendar · ${todo.date}`,
        },
      });
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runReviseTopicVariant = useCallback(
    async (
      action: Extract<
        DirectorAction,
        { type: 'revise_topic_variant' }
      >,
      agentJobId?: string
    ) => {
      const variant = storeRef.current.topicVariants.find(
        (item) => item.id === action.topicVariantId
      );
      const topic = variant
        ? storeRef.current.topics.find((item) => item.id === variant.topicId)
        : undefined;
      if (!variant) {
        await publishDirectorMessage({
          role: 'assistant',
          lane: 'background',
          agentJobId,
          content:
            locale !== 'en'
              ? '我没有找到这个选题版本，暂时没有修改。'
              : 'I could not find that topic variant, so nothing was changed.',
        });
        return;
      }
      const patch = {
        ...(action.hook ? { hook: action.hook } : {}),
        ...(action.angle ? { angle: action.angle } : {}),
        ...(action.format ? { format: action.format } : {}),
        ...(action.cta ? { cta: action.cta } : {}),
      };
      gtm.updateTopicVariant(variant.id, patch);
      await publishDirectorMessage({
        role: 'assistant',
        lane: 'background',
        agentJobId,
        content:
          locale !== 'en'
            ? `已经更新「${topic?.title ?? variant.channelName}」的 ${variant.channelName} 版本，左侧选题库里是最新内容。`
            : `Updated the ${variant.channelName} version of “${topic?.title ?? variant.channelName}”. The topic library now shows the latest copy.`,
      });
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runActions = useCallback(
    async (
      actions: DirectorAction[],
      agentJobId?: string,
      sourceMessageIds: string[] = []
    ) => {
      for (const [actionIndex, action] of actions.entries()) {
        // One Director turn may dispatch several artifact-producing actions.
        // Each action needs its own idempotency key so completing the first one
        // never causes the remaining actions to be mistaken for duplicates.
        const executionId = agentJobId
          ? `${agentJobId}:${actionIndex}:${action.type}`
          : undefined;
        if (action.type === 'generate_strategy') {
          await runGenerateStrategy(action.channelIds, action.feedback);
        } else if (action.type === 'generate_todos') {
          // 首次排期必须覆盖用户已确认的全部渠道（LLM 只带部分渠道时补全）；
          // 已有 To-Do 后（新增/调整渠道）只处理指定渠道
          const hasTodos = storeRef.current.todos.length > 0;
          const ids = hasTodos && action.channelIds.length > 0
            ? action.channelIds
            : [...new Set([...action.channelIds, ...storeRef.current.channels])];
          if (ids.length > 0) await runGenerateTodos(ids);
        } else if (action.type === 'generate_topics') {
          await runGenerateTopics(
            action.channelIds,
            action.count ?? 7,
            executionId
          );
        } else if (action.type === 'research_product') {
          await runProductResearch(action.websiteUrl, executionId);
        } else if (action.type === 'generate_weekly_review') {
          await runWeeklyReview({
            silent: action.silent,
            agentJobId: executionId,
          });
        } else if (action.type === 'schedule_topic_variant') {
          await runScheduleTopicVariant(
            action.topicVariantId,
            action.date,
            action.time,
            executionId
          );
        } else if (action.type === 'revise_topic_variant') {
          await runReviseTopicVariant(action, executionId);
        } else if (action.type === 'generate_todo_content') {
          await runGenerateTodoContent(action.todoId, executionId);
        } else if (action.type === 'rewrite_todo_content') {
          await runRewriteTodoContent(action.todoId, action.feedback);
        } else if (action.type === 'optimize_plan') {
          const ids =
            action.channelIds.length > 0
              ? action.channelIds
              : storeRef.current.channels;
          if (ids.length === 0) continue;
          const strategyUpdated = await runGenerateStrategy(
            ids,
            action.feedback,
            { skipConfirmation: true }
          );
          if (strategyUpdated) {
            await runGenerateTodos(ids, { preservePublished: true });
            const sourceIds = new Set(sourceMessageIds);
            const referencedArtifactIds = storeRef.current.directorChat
              .filter(
                (message) =>
                  sourceIds.has(message.id) &&
                  message.contextRef?.entityType === 'artifact' &&
                  message.contextRef.entityId
              )
              .map((message) => message.contextRef!.entityId as string);
            for (const artifactId of referencedArtifactIds) {
              const artifact = storeRef.current.artifacts.find(
                (item) => item.id === artifactId
              );
              if (artifact?.status === 'waiting_approval') {
                gtm.updateArtifact(artifactId, { status: 'applied' });
              }
            }
            await publishDirectorMessage({
              role: 'assistant',
              content:
                locale !== 'en'
                  ? '数据优化已经应用：未来尚未发布的任务已更新，已发布内容和全部数据快照保持不变。'
                  : 'Performance optimization applied. Future unpublished tasks were updated; published posts and metric history were preserved.',
            });
          }
        }
      }
    },
    [
      locale,
      publishDirectorMessage,
      runGenerateStrategy,
      runGenerateTodos,
      runGenerateTopics,
      runGenerateTodoContent,
      runProductResearch,
      runReviseTopicVariant,
      runRewriteTodoContent,
      runScheduleTopicVariant,
      runWeeklyReview,
    ]
  );

  const scheduleActions = useCallback(
    (
      actions: DirectorAction[],
      sourceMessageIds: string[] = [],
      existingJobId?: string
    ): string => {
      const jobId = existingJobId ?? crypto.randomUUID();
      if (scheduledActionJobIdsRef.current.has(jobId)) return jobId;
      scheduledActionJobIdsRef.current.add(jobId);

      if (
        !gtm.store.agentActionJobs.some((job) => job.id === jobId)
      ) {
        const now = Date.now();
        gtm.enqueueAgentActionJob({
          id: jobId,
          actions,
          sourceMessageIds,
          status: 'queued',
          createdAt: now,
          updatedAt: now,
        });
      }

      // Mutating workers are serialized in user-message order. The foreground
      // director may keep answering, but two strategy/calendar jobs can never
      // race and overwrite each other. Web Locks extend that guarantee across
      // tabs in the same browser; the short completion marker lets a waiting
      // tab distinguish "the other tab finished" from a crashed worker.
      const scheduled = actionTailRef.current
        .catch(() => undefined)
        .then(async () => {
          const execute = async () => {
            gtm.updateAgentActionJob(jobId, { status: 'running' });
            await runActions(actions, jobId, sourceMessageIds);
          };
          if (
            typeof navigator === 'undefined' ||
            !navigator.locks ||
            typeof localStorage === 'undefined'
          ) {
            await execute();
            return;
          }

          const completionKey = `nowbuild-agent-job-completed-${jobId}`;
          await navigator.locks.request(
            `nowbuild-agent-job-${jobId}`,
            async () => {
              let completedAt = 0;
              try {
                completedAt = Number(localStorage.getItem(completionKey) ?? 0);
              } catch {
                // Storage can be disabled; the lock still serializes the tabs.
              }
              if (
                Number.isFinite(completedAt) &&
                Date.now() - completedAt < 60_000
              ) {
                return;
              }
              await execute();
              try {
                localStorage.setItem(completionKey, String(Date.now()));
              } catch {
                // The durable outbox remains the fallback when storage is full.
              }
            }
          );
        })
        .catch(async (error) => {
          await publishDirectorMessage({
            role: 'assistant',
            lane: 'background',
            agentJobId: jobId,
            content:
              locale !== 'en'
                ? `后台任务没有完成：${
                    error instanceof Error ? error.message : '未知错误'
                  }`
                : `A background task did not finish: ${
                    error instanceof Error ? error.message : 'unknown error'
                  }`,
          });
        })
        .finally(() => {
          gtm.removeAgentActionJob(jobId);
          scheduledActionJobIdsRef.current.delete(jobId);
        });
      actionTailRef.current = scheduled;
      void scheduled;
      return jobId;
    },
    [gtm, locale, publishDirectorMessage, runActions]
  );

  // Resume Worker commands that were already accepted before a refresh.
  useEffect(() => {
    if (!gtm.hydrated) return;
    for (const job of gtm.store.agentActionJobs) {
      scheduleActions(job.actions, job.sourceMessageIds, job.id);
    }
  }, [gtm.hydrated, gtm.store.agentActionJobs, scheduleActions]);

  /**
   * Clear work that has not started yet and abort the current director request
   * when possible. Already-dispatched strategy/todo jobs are deliberately not
   * rolled back here because they may have committed partial business output.
   */
  const cancelPending = useCallback(
    (options?: { abortActive?: boolean }): number => {
      const cancelled = mailboxRef.current.length;
      cancelEpochRef.current += 1;
      mailboxRef.current = [];
      setPendingCount(0);
      gtm.clearAgentRequests();
      if (options?.abortActive !== false) {
        abortControllerRef.current?.abort();
      }
      return cancelled;
    },
    [gtm]
  );

  /**
   * FIFO mailbox consumer. Only this loop is allowed to call the main director,
   * so user messages can keep arriving while visible replies remain serialized.
   */
  const processMailbox = useCallback(async () => {
    if (
      processingRef.current ||
      mailboxRef.current.length === 0 ||
      !mountedRef.current
    ) {
      return;
    }

    processingRef.current = true;
    setProcessing(true);

    try {
      while (mountedRef.current && mailboxRef.current.length > 0) {
        const epochAtStart = cancelEpochRef.current;

        // Short batching window: preserve every UI bubble, but treat adjacent
        // supplements as one coherent director turn.
        await wait(MESSAGE_COALESCE_MS);
        if (!mountedRef.current) break;
        if (epochAtStart !== cancelEpochRef.current) continue;

        const batch = takeMailboxBatch(mailboxRef.current);
        setPendingCount(mailboxRef.current.length);
        if (batch.length === 0) continue;

        const executeBatch = async (
          activeBatch: QueuedDirectorMessage[]
        ): Promise<boolean> => {
          const controller = new AbortController();
          abortControllerRef.current = controller;
          const batchIds = new Set(activeBatch.map((item) => item.id));
          const requestStore = storeRef.current;
          const history = requestStore.directorChat.filter(
            (message) => !batchIds.has(message.id)
          );
          const viewContext = activeBatch[0]?.viewContext;

          try {
            const res = await callDirector({
              message: combineQueuedMessages(activeBatch),
              history,
              store: requestStore,
              locale,
              viewContext,
              signal: controller.signal,
            });

            // A cancelled request may still resolve on runtimes that do not
            // propagate AbortSignal all the way upstream. Never publish it.
            if (
              controller.signal.aborted ||
              epochAtStart !== cancelEpochRef.current ||
              !mountedRef.current
            ) {
              return false;
            }

            await publishDirectorMessage({
              role: 'assistant',
              content: res.reply,
              replyToMessageIds: activeBatch.map((item) => item.id),
              lane: 'foreground',
              card: res.optionCard
                ? { kind: 'options', card: res.optionCard }
                : undefined,
            });
            void syncContext();

            let actions = res.actions ?? [];
            const confirmStrategy = activeBatch.some(
              (item) => item.meta?.confirmStrategy
            );
            // 兜底：用户已明确确认策略，但模型没有派发排期动作 → 前端补上，保证流程不断
            if (
              confirmStrategy &&
              storeRef.current.todos.length === 0 &&
              !actions.some((action) => action.type === 'generate_todos')
            ) {
              actions = [
                ...actions,
                {
                  type: 'generate_todos',
                  channelIds: storeRef.current.channels,
                },
              ];
            }
            if (actions.length > 0) {
              // Workers continue independently from the foreground conversation,
              // but mutating action sets retain FIFO order.
              scheduleActions(
                actions,
                activeBatch.map((item) => item.id)
              );
            }
            gtm.removeAgentRequests(activeBatch.map((item) => item.id));
            return true;
          } catch (err) {
            if (
              !controller.signal.aborted &&
              epochAtStart === cancelEpochRef.current &&
              mountedRef.current
            ) {
              await publishDirectorMessage({
                role: 'assistant',
                replyToMessageIds: activeBatch.map((item) => item.id),
                lane: 'foreground',
                content:
                  locale !== 'en'
                    ? `抱歉，我这边出了点问题（${err instanceof Error ? err.message : '未知错误'}）。稍等片刻再发一次，或者换个说法试试。`
                    : `Sorry, something went wrong (${err instanceof Error ? err.message : 'unknown error'}). Please try again in a moment.`,
              });
            }
            // A failed foreground reply has been surfaced to the user; do not
            // retry forever after every refresh. The user can resend explicitly.
            if (!controller.signal.aborted) {
              gtm.removeAgentRequests(activeBatch.map((item) => item.id));
              return true;
            }
            return false;
          } finally {
            if (abortControllerRef.current === controller) {
              abortControllerRef.current = null;
            }
          }
        };

        if (
          typeof navigator !== 'undefined' &&
          navigator.locks &&
          typeof localStorage !== 'undefined'
        ) {
          await navigator.locks.request(
            'nowbuild-director-consumer',
            async () => {
              const activeBatch = batch.filter((item) => {
                try {
                  const handledAt = Number(
                    localStorage.getItem(
                      `nowbuild-director-message-handled-${item.id}`
                    ) ?? 0
                  );
                  return (
                    !Number.isFinite(handledAt) ||
                    Date.now() - handledAt >= 24 * 60 * 60 * 1000
                  );
                } catch {
                  return true;
                }
              });
              const alreadyHandled = batch.filter(
                (item) => !activeBatch.includes(item)
              );
              if (alreadyHandled.length > 0) {
                gtm.removeAgentRequests(
                  alreadyHandled.map((item) => item.id)
                );
              }
              if (activeBatch.length === 0) return;
              const handled = await executeBatch(activeBatch);
              if (!handled) return;
              for (const item of activeBatch) {
                try {
                  localStorage.setItem(
                    `nowbuild-director-message-handled-${item.id}`,
                    String(Date.now())
                  );
                } catch {
                  break;
                }
              }
            }
          );
        } else {
          await executeBatch(batch);
        }
      }
    } finally {
      processingRef.current = false;
      if (mountedRef.current) setProcessing(false);

      // Cover a message arriving between the final while check and cleanup.
      if (mountedRef.current && mailboxRef.current.length > 0) {
        void Promise.resolve().then(() => processorRef.current());
      }
    }
  }, [gtm, locale, publishDirectorMessage, scheduleActions, syncContext]);
  processorRef.current = processMailbox;

  /** 发送文字消息（或提交选项卡答案）：立即显示，再进入异步邮箱。 */
  const send = useCallback(
    (text: string, meta?: DirectorSendMeta): ChatMessage | undefined => {
      const normalized = text.trim();
      if (!normalized) return undefined;
      const capturedContext = enrichViewContext(
        meta?.viewContext ?? defaultViewContext,
        storeRef.current
      );

      const userMessage = gtm.addDirectorMessage({
        role: 'user',
        content: normalized,
        contextRef: capturedContext,
      });

      if (isStopCommand(normalized)) {
        const cancelled = cancelPending();
        void publishDirectorMessage({
          role: 'assistant',
          replyToMessageIds: [userMessage.id],
          lane: 'foreground',
          content:
            locale !== 'en'
              ? `已停止当前回复，并清空 ${cancelled} 条尚未开始处理的消息。已经开始执行的后台任务可能仍会完成。`
              : `Stopped the current reply and cleared ${cancelled} queued message${cancelled === 1 ? '' : 's'}. Background work that already started may still finish.`,
        });
        return userMessage;
      }

      // 用户在渠道选择卡中勾选的渠道 → 直接落到 store
      if (meta?.selectedIds && meta.selectedIds.length > 0) {
        const known = meta.selectedIds.filter((id) =>
          /^(xiaohongshu|user_outreach|twitter_x|wechat_official|reddit|linkedin|product_hunt|github_growth|website_copy|user_interview|competitor_research)$/.test(id)
        );
        if (known.length > 0) {
          gtm.setChannels([
            ...new Set([...storeRef.current.channels, ...known]),
          ]);
        }
      }

      mailboxRef.current.push({
        id: userMessage.id,
        text: normalized,
        meta,
        viewContext: capturedContext,
      });
      gtm.enqueueAgentRequest({
        id: userMessage.id,
        messageId: userMessage.id,
        text: normalized,
        context: capturedContext,
        meta: meta
          ? {
              fromOptionCard: meta.fromOptionCard,
              selectedIds: meta.selectedIds,
              confirmStrategy: meta.confirmStrategy,
            }
          : undefined,
        createdAt: userMessage.createdAt,
      });
      setPendingCount(mailboxRef.current.length);
      void processorRef.current();
      return userMessage;
    },
    [
      cancelPending,
      defaultViewContext,
      gtm,
      locale,
      publishDirectorMessage,
    ]
  );

  /** 提交选项卡片的选择 */
  const submitOptions = useCallback(
    (messageId: string, card: OptionCard, selected: string[], customText?: string) => {
      const labels = card.options
        .filter((o) => selected.includes(o.id))
        .map((o) => o.label);
      if (customText) labels.push(customText);
      gtm.patchDirectorMessage(messageId, {
        card: { kind: 'options', card: { ...card, answered: labels } },
      });
      void send(`我的选择：${labels.join('、')}`, {
        fromOptionCard: true,
        selectedIds: selected,
        confirmStrategy: selected.includes('confirm_strategy'),
      });
    },
    [gtm, send]
  );

  /** 提交冷启动问卷（多题固定卡片） */
  const submitKickoff = useCallback(
    (messageId: string, card: KickoffCard, answers: Record<string, string[]>) => {
      gtm.patchDirectorMessage(messageId, {
        card: { kind: 'kickoff', card: { ...card, answered: answers } },
      });
      void send(formatKickoffAnswers(card, answers, locale !== 'en'));
    },
    [gtm, locale, send]
  );

  return {
    send,
    submitOptions,
    submitKickoff,
    /** Backwards-compatible name for existing UI. */
    sending: processing,
    processing,
    pendingCount,
    busy:
      processing ||
      pendingCount > 0 ||
      backgroundTasks.length > 0 ||
      gtm.store.agentActionJobs.length > 0,
    cancelPending,
    stop: cancelPending,
    backgroundTasks,
    runGenerateStrategy,
    runGenerateTodos,
    runGenerateTopics,
    runProductResearch,
    runWeeklyReview,
    enqueueActions: scheduleActions,
  };
}

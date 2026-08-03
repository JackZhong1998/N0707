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
  callChannelRecommender,
  callChannelTodos,
  callChannelWrite,
  callArtifactWriter,
  callContextAgent,
  callDirector,
  callLaunchPatch,
  callProductResearch,
  callResearchQuery,
  callStrategist,
  callTopicPlanner,
  callWeeklyReflection,
  enqueueChannelPlans,
  pollChannelPlans,
  enqueueAgentWork,
  pollAgentWork,
} from './api-client';
import { addDays, parseDateStr, todayStr } from './dates';
import { defaultTargetMarket, resolveTodoMarket } from './target-markets';
import { buildAgentContextEnvelope } from './agent-context';
import { filterCalendarChannelIds } from './channel-capabilities';
import {
  chooseTopicScheduleDay,
  chooseTopicScheduleTime,
} from './topic-scheduling';
import { applyStrategyToChannelPlans, resolvePendingChannelPlanIds } from './launch';
import { buildDirectoryLaunchKit } from '@/lib/directories/materials';
import { applyDirectoryMaterialValues } from '@/lib/directories/material-card';
import { defaultWorkLabel } from './agent-work-expand';
import { formatKickoffAnswers } from './kickoff';
import {
  buildChannelSelectOptionCard,
  withFixedDirectory,
} from './post-pay-profile';
import {
  CONTEXT_SYNC_INTERVAL,
  FREE_BRIEF_EDIT_LIMIT,
  type ChatMessage,
  type DirectorAction,
  type GtmStore,
  type KickoffCard,
  type DirectoryMaterialKey,
  type DirectoryMaterialsCard,
  type LaunchBlueprint,
  type LaunchBrief,
  type LaunchChannelPlan,
  type LaunchRevision,
  type MemoryFact,
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
  } else if (context.entityType === 'launch_brief') {
    detail = store.launch?.brief
      ? JSON.stringify(store.launch.brief, null, 2)
      : '';
  } else if (context.entityType === 'launch_blueprint') {
    detail = store.launch?.blueprint
      ? JSON.stringify(store.launch.blueprint, null, 2)
      : '';
  } else if (context.entityType === 'channel_plan' && context.channelId) {
    const plan = store.launch?.channelPlans[context.channelId];
    detail = plan ? JSON.stringify(plan, null, 2) : '';
  } else if (
    ['calendar', 'calendar_period'].includes(context.entityType ?? '')
  ) {
    detail = JSON.stringify(
      store.todos.map((todo) => ({
        id: todo.id,
        channelId: todo.channelId,
        dayIndex: todo.dayIndex,
        date: todo.date,
        time: todo.time,
        title: todo.title,
        purpose: todo.purpose,
        pillar: todo.pillar,
        status: todo.status,
        launchStatus: todo.launchStatus,
        publishedUrl: todo.publishedUrl,
      })),
      null,
      2
    );
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

function launchEntityRevision(
  store: GtmStore,
  entityType: 'brief' | 'blueprint' | 'channel_plan' | 'calendar',
  entityId?: string
): number {
  const launch = store.launch;
  if (entityType === 'brief') return launch?.brief?.revision ?? 1;
  if (entityType === 'blueprint') return launch?.blueprint?.revision ?? 1;
  if (entityType === 'channel_plan') {
    return launch?.channelPlans[entityId ?? '']?.revision ?? 1;
  }
  return Math.max(
    1,
    store.todos.reduce((sum, todo) => sum + (todo.revision ?? 1), 0)
  );
}

function launchEntityValue(
  store: GtmStore,
  entityType: 'brief' | 'blueprint' | 'channel_plan' | 'calendar',
  entityId?: string
): unknown {
  if (entityType === 'brief') return store.launch?.brief;
  if (entityType === 'blueprint') return store.launch?.blueprint;
  if (entityType === 'channel_plan') {
    return store.launch?.channelPlans[entityId ?? ''];
  }
  return store.todos;
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
  const channelPlanPollLockRef = useRef<Promise<void> | null>(null);
  const channelPlanResumeRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  // store 的最新引用（后台任务链中避免闭包读到旧值）
  const storeRef = useRef<GtmStore>(gtm.store);
  storeRef.current = gtm.store;
  // React 状态落盘前的同步缓存：策略生成后立即派发 To-Do 时使用
  const freshStrategiesRef = useRef<Record<string, { markdown: string; name: string }>>({});
  const postPayCardPostedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      mailboxRef.current = [];
    };
  }, []);

  /**
   * Serialize job polling loops without ever dropping one: a caller that finds
   * the lock taken waits for its turn instead of returning, otherwise the job
   * it just enqueued is never polled, its progress card never advances, and its
   * durable pointer is never released (which then blocks the next action).
   */
  const withPollLock = useCallback(async (run: () => Promise<void>) => {
    while (channelPlanPollLockRef.current) {
      await channelPlanPollLockRef.current.catch(() => undefined);
    }
    const lock = run().finally(() => {
      if (channelPlanPollLockRef.current === lock) {
        channelPlanPollLockRef.current = null;
      }
    });
    channelPlanPollLockRef.current = lock;
    await lock;
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

  // Payment unlocks execution. Ask for the channels to execute directly and
  // expose Directory as its own workstream; no extra profile questionnaire.
  useEffect(() => {
    const launch = gtm.store.launch;
    const recommendations = launch?.channelRecommendations;
    if (!gtm.hydrated || !gtm.store.paid || !launch?.brief || !recommendations) {
      return;
    }
    if (postPayCardPostedRef.current) return;
    const alreadyShown = gtm.store.directorChat.some(
      (message) =>
        message.card?.kind === 'options' &&
        (message.card.card.question.includes('选择接下来要执行的渠道') ||
          message.card.card.question.includes('Choose the channels to execute next'))
    );
    const executionStarted =
      Object.keys(gtm.store.channelStrategies).length > 0 ||
      gtm.store.todos.length > 0 ||
      Boolean(launch.channelPlanJob);
    if (alreadyShown || executionStarted) {
      postPayCardPostedRef.current = true;
      return;
    }
    postPayCardPostedRef.current = true;
    const isZh = locale !== 'en';
    gtm.setSelectedChannelIds([]);
    gtm.update({ postPayProfileComplete: true });
    void (async () => {
      await publishDirectorMessage({
        role: 'assistant',
        content: isZh
          ? '支付已完成。请选择接下来真正要执行的渠道；确认后，我会依次生成对应的渠道计划，再进入 Todo。'
          : 'Payment is complete. Choose the channels you want to execute next. After confirmation, I will generate each channel plan and then move into todos.',
        card: {
          kind: 'options',
          card: buildChannelSelectOptionCard(
            recommendations.recommendations,
            isZh
          ),
        },
      });
      await publishDirectorMessage({
        role: 'assistant',
        content: isZh
          ? 'Directory 是独立的发布工作流。点击下面的内容卡片，查看最适合这个产品的平台和提交计划。'
          : 'Directory is a separate launch workstream. Open the card below to see the best-fit platforms and submission plan for this product.',
        card: { kind: 'directory_pipeline' },
      });
    })();
  }, [
    gtm,
    gtm.hydrated,
    gtm.store.paid,
    gtm.store.launch,
    gtm.store.channelStrategies,
    gtm.store.todos.length,
    gtm.store.directorChat,
    locale,
    publishDirectorMessage,
  ]);

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

  /**
   * A settled job must not leave its durable pointer behind: every mount
   * re-attaches to that pointer, so the UI would stay "working in the
   * background" forever after the worker stopped writing progress.
   */
  const releaseServerJobPointer = useCallback(
    (serverJobId: string) => {
      const launch = storeRef.current.launch;
      if (!launch) return;
      const wasWorkJob = launch.activeAgentWorkJob?.jobId === serverJobId;
      const wasPlanJob = launch.channelPlanJob?.jobId === serverJobId;
      if (!wasWorkJob && !wasPlanJob) return;
      gtm.update({
        launch: {
          ...launch,
          activeAgentWorkJob: wasWorkJob
            ? undefined
            : launch.activeAgentWorkJob,
          channelPlanJob: wasPlanJob ? undefined : launch.channelPlanJob,
          project: { ...launch.project, updatedAt: Date.now() },
        },
      });
    },
    [gtm]
  );

  const runGenerateStrategy = useCallback(
    async (
      channelIds: string[],
      feedback?: string
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
        await publishDirectorMessage({
          role: 'assistant',
          content: isZh
            ? `Campaign Blueprint 和各渠道打法已经更新：\n\n${channelSummary}\n\n系统会继续生成或重排未来未完成任务；已发布内容和历史数据保持不变。你随时可以直接指出要改的部分。`
            : `The Campaign Blueprint and channel plays are updated:\n\n${channelSummary}\n\nThe system will continue generating or replanning future unfinished work. Published content and history stay unchanged, and you can request a correction at any time.`,
        });
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

  const runRecommendChannels = useCallback(
    async (feedback?: string) => {
      const taskId = `recommend-${Date.now()}`;
      const isZh = locale !== 'en';
      setBackgroundTasks((t) => [...t, taskId]);
      const cardMsg = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: isZh
            ? '推广计划 Agent 正在分析产品、目标市场与发布节奏…'
            : 'Promotion Plan Agent is analyzing the product, market, and launch rhythm…',
          status: 'running',
        },
      });
      try {
        const res = await callChannelRecommender({
          store: storeRef.current,
          locale,
          feedback,
        });
        gtm.setChannelRecommendations(res);
        gtm.patchDirectorMessage(cardMsg.id, {
          card: {
            kind: 'agent-task',
            label: isZh ? '市场策略报告已生成' : 'Market strategy report ready',
            status: 'done',
          },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content: isZh
            ? '市场策略报告已经写进左侧「文档」。点击下方卡片可查看完整诊断、30 天排期、渠道优先级和 Directory 提交计划。请再确认本轮要执行的渠道。'
            : 'The Market Strategy Report is in Documents—open the card for the complete diagnosis, 30-day schedule, channel priorities, and directory submission plan. Then confirm the channels to execute.',
          card: {
            kind: 'channel_recommendations',
            title: isZh ? '30 天市场策略报告' : '30-Day Market Strategy Report',
          },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content: isZh ? '选择渠道' : 'Select channels',
          card: {
            kind: 'options',
            card: buildChannelSelectOptionCard(res.recommendations, isZh),
          },
        });
      } catch (err) {
        gtm.patchDirectorMessage(cardMsg.id, {
          card: {
            kind: 'agent-task',
            label: isZh
              ? `渠道推荐失败：${err instanceof Error ? err.message : '未知错误'}`
              : `Recommendations failed: ${err instanceof Error ? err.message : 'unknown error'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((t) => t.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runSelectChannels = useCallback(
    async (channelIds: string[]) => {
      if (channelIds.length === 0) return;
      gtm.setSelectedChannelIds(channelIds);
      const isZh = locale !== 'en';
      await publishDirectorMessage({
        role: 'assistant',
        content: isZh
          ? `已确认 ${channelIds.length} 个渠道：${channelIds.join('、')}。现在开始依次生成对应的渠道计划。`
          : `Confirmed ${channelIds.length} channels: ${channelIds.join(', ')}. I am now generating each corresponding channel plan.`,
      });
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runGenerateChannelPlans = useCallback(
    async (channelIds: string[], force = false) => {
      if (channelIds.length === 0) return;
      const isZh = locale !== 'en';
      const taskId = `channel-plans-${Date.now()}`;
      setBackgroundTasks((t) => [...t, taskId]);

      const finishTodosPrompt = async () => {
        await publishDirectorMessage({
          role: 'assistant',
          content: isZh
            ? '渠道计划已全部返回。可在左侧「文档」查看详情。Directory 是固定能力，记得稍后去提交。需要我为这些渠道生成 Todo 吗？'
            : 'All channel plans are back—open Documents for details. Directory is always on; I’ll remind you to submit. Generate todos for these channels?',
        });
        await publishDirectorMessage({
          role: 'assistant',
          // The options card renders its own question and title.
          content: '',
          card: {
            kind: 'options',
            card: {
              question: isZh ? '是否生成 Todo？' : 'Generate todos?',
              multi: false,
              options: [
                {
                  id: 'generate_todos_yes',
                  label: isZh
                    ? '生成全部渠道的 Todo'
                    : 'Generate todos for all channels',
                },
                {
                  id: 'generate_todos_later',
                  label: isZh ? '稍后再说' : 'Not yet',
                },
              ],
            },
          },
        });
      };

      try {
        const syncRemote = async () => {
          try {
            const response = await fetch('/api/gtm/state', { cache: 'no-store' });
            if (!response.ok) return;
            const payload = (await response.json()) as {
              store?: GtmStore;
              revision?: string;
            };
            if (payload.store) {
              gtm.adoptRemoteStore(payload.store, payload.revision);
            }
          } catch {
            // Polling can continue on the job endpoint alone.
          }
        };

        const pollUntilSettled = async (jobId: string) => {
          await withPollLock(async () => {
            for (;;) {
              if (!mountedRef.current) return;
              const { job } = await pollChannelPlans(jobId);
              await syncRemote();
              if (!job || job.status === 'completed') {
                releaseServerJobPointer(jobId);
                return;
              }
              if (job.status === 'failed' || job.status === 'cancelled') {
                // The pointer stays so "continue channel plans" can resume it.
                throw new Error(
                  job.last_error ||
                    (isZh ? '渠道计划任务失败' : 'Channel-plan job failed')
                );
              }
              await wait(2500);
            }
          });
        };

        // Resume an in-flight server job after refresh / remount.
        const active = storeRef.current.launch?.channelPlanJob;
        if (active?.jobId) {
          await pollUntilSettled(active.jobId);
          await syncRemote();
          const stillActive = storeRef.current.launch?.channelPlanJob;
          if (!stillActive) return;
          // Job row may be gone while chat already has the todos prompt.
          return;
        }

        const pendingIds = resolvePendingChannelPlanIds(
          storeRef.current,
          channelIds,
          { force }
        );
        if (pendingIds.length === 0) {
          await publishDirectorMessage({
            role: 'assistant',
            content: isZh
              ? '这些渠道的计划都已经写好了，无需再跑一遍。可以直接生成 Todo，或告诉我要重做哪几个渠道。'
              : 'Those channel plans are already ready—no need to run them again. Generate todos next, or tell me which channels to regenerate.',
          });
          await finishTodosPrompt();
          return;
        }

        const cardMsg = await publishDirectorMessage({
          role: 'assistant',
          content: '',
          card: {
            kind: 'agent-task',
            label: isZh
              ? `渠道专员正在编写计划（0/${pendingIds.length}）…`
              : `Writing channel plans (0/${pendingIds.length})…`,
            status: 'running',
          },
        });

        // Keep a local pointer so refresh can reattach before the first PUT lands.
        const launch = storeRef.current.launch;
        if (launch) {
          gtm.update({
            launch: {
              ...launch,
              channelPlanJob: {
                jobId: '',
                taskMessageId: cardMsg.id,
                channelIds: pendingIds,
                completedCount: 0,
                totalCount: pendingIds.length,
                force,
                updatedAt: Date.now(),
              },
              project: { ...launch.project, updatedAt: Date.now() },
            },
          });
        }

        let enqueued;
        try {
          enqueued = await enqueueChannelPlans({
            channelIds: pendingIds,
            store: storeRef.current,
            locale,
            taskMessageId: cardMsg.id,
            force,
          });
        } catch (err) {
          // Local demo / unpaid sessions: keep a filtered browser fallback.
          const message = err instanceof Error ? err.message : '';
          if (!/unauthorized|401|403/i.test(message)) throw err;

          const existingOverview =
            storeRef.current.strategy?.overviewMarkdown ||
            (launch?.brief
              ? [
                  `# ${isZh ? 'Campaign 主线' : 'Campaign spine'}`,
                  launch.brief.positioning.statement,
                  launch.brief.audience.primary,
                  ...launch.brief.positioning.sellingPoints.map((d) => `- ${d}`),
                ].join('\n\n')
              : '');
          let finished = 0;
          await Promise.allSettled(
            pendingIds.map(async (channelId) => {
              try {
                const res = await callStrategist({
                  channelIds: [channelId],
                  store: storeRef.current,
                  locale,
                  phase: 'channel',
                  existingOverview,
                });
                const generated =
                  res.channels.find((item) => item.channelId === channelId) ??
                  res.channels[0];
                if (!generated) {
                  throw new Error(
                    isZh ? '渠道策略为空' : 'Empty channel strategy'
                  );
                }
                freshStrategiesRef.current[channelId] = {
                  markdown: generated.markdown,
                  name: generated.channelName,
                };
                gtm.upsertChannelStrategy({
                  channelId: generated.channelId,
                  channelName: generated.channelName,
                  positioning: generated.positioning,
                  direction: generated.direction,
                  contentPillars: generated.contentPillars,
                  markdown: generated.markdown,
                  updatedAt: Date.now(),
                });
                const currentLaunch = storeRef.current.launch;
                if (currentLaunch) {
                  const nextPlans = applyStrategyToChannelPlans(
                    currentLaunch,
                    {
                      goal: res.goal,
                      overviewMarkdown: res.overviewMarkdown,
                      channels: [generated],
                    },
                    isZh
                  );
                  gtm.update({
                    launch: {
                      ...currentLaunch,
                      channelPlans: {
                        ...currentLaunch.channelPlans,
                        [channelId]: {
                          ...nextPlans[channelId],
                          status: 'ready',
                        },
                      },
                      channelPlanJob: undefined,
                      project: {
                        ...currentLaunch.project,
                        updatedAt: Date.now(),
                      },
                    },
                  });
                }
                await publishDirectorMessage({
                  role: 'assistant',
                  content: '',
                  card: {
                    kind: 'channel_plan',
                    channelId: generated.channelId,
                    channelName: generated.channelName,
                  },
                });
              } catch (channelErr) {
                await publishDirectorMessage({
                  role: 'assistant',
                  content: isZh
                    ? `${channelId} 计划生成失败：${
                        channelErr instanceof Error
                          ? channelErr.message
                          : '未知错误'
                      }`
                    : `${channelId} plan failed: ${
                        channelErr instanceof Error
                          ? channelErr.message
                          : 'unknown error'
                      }`,
                });
              } finally {
                finished += 1;
                gtm.patchDirectorMessage(cardMsg.id, {
                  card: {
                    kind: 'agent-task',
                    label: isZh
                      ? `渠道专员正在编写计划（${finished}/${pendingIds.length}）…`
                      : `Writing channel plans (${finished}/${pendingIds.length})…`,
                    status:
                      finished === pendingIds.length ? 'done' : 'running',
                  },
                });
              }
            })
          );
          await finishTodosPrompt();
          return;
        }

        if (enqueued.skipped || !enqueued.job) {
          gtm.patchDirectorMessage(cardMsg.id, {
            card: {
              kind: 'agent-task',
              label: isZh
                ? '渠道计划已全部就绪'
                : 'All channel plans are ready',
              status: 'done',
            },
          });
          const currentLaunch = storeRef.current.launch;
          if (currentLaunch) {
            gtm.update({
              launch: {
                ...currentLaunch,
                channelPlanJob: undefined,
                project: { ...currentLaunch.project, updatedAt: Date.now() },
              },
            });
          }
          await finishTodosPrompt();
          return;
        }

        {
          const currentLaunch = storeRef.current.launch;
          if (currentLaunch?.channelPlanJob) {
            gtm.update({
              launch: {
                ...currentLaunch,
                channelPlanJob: {
                  ...currentLaunch.channelPlanJob,
                  jobId: enqueued.job.id,
                  channelIds: enqueued.channelIds ?? pendingIds,
                  totalCount:
                    enqueued.channelIds?.length ??
                    currentLaunch.channelPlanJob.totalCount,
                  updatedAt: Date.now(),
                },
                project: { ...currentLaunch.project, updatedAt: Date.now() },
              },
            });
          }
        }

        await pollUntilSettled(enqueued.job.id);
        await syncRemote();
      } catch (err) {
        await publishDirectorMessage({
          role: 'assistant',
          content: isZh
            ? `渠道计划任务没有完成：${
                err instanceof Error ? err.message : '未知错误'
              }。你可以再说一次「继续跑完渠道计划」。`
            : `Channel-plan job did not finish: ${
                err instanceof Error ? err.message : 'unknown error'
              }. Say “continue channel plans” to resume.`,
        });
        const currentLaunch = storeRef.current.launch;
        const taskMessageId = currentLaunch?.channelPlanJob?.taskMessageId;
        if (taskMessageId) {
          gtm.patchDirectorMessage(taskMessageId, {
            card: {
              kind: 'agent-task',
              label: isZh
                ? '渠道计划生成中断，可继续'
                : 'Channel-plan generation interrupted — you can continue',
              status: 'error',
            },
          });
        }
      } finally {
        setBackgroundTasks((t) => t.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage, releaseServerJobPointer, withPollLock]
  );

  const runGenerateTodos = useCallback(
    async (
      requestedChannelIds: string[],
      options?: { preservePublished?: boolean; storeOverride?: GtmStore }
    ) => {
      const channelIds = filterCalendarChannelIds(requestedChannelIds);
      if (channelIds.length === 0) return;
      const isZh = locale !== 'en';
      const taskId = `todos-${Date.now()}`;
      setBackgroundTasks((t) => [...t, taskId]);
      const startDate =
        options?.storeOverride?.startDate ??
        storeRef.current.startDate ??
        todayStr();
      if (!storeRef.current.startDate) {
        gtm.update({ startDate });
      }

      const cardMsg = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: isZh
            ? `渠道专员正在编写 To-Do（0/${channelIds.length}）…`
            : `Writing todos (0/${channelIds.length})…`,
          status: 'running',
        },
      });

      let finished = 0;
      let succeeded = 0;

      await Promise.allSettled(
        channelIds.map(async (channelId) => {
          try {
            const executionStore = options?.storeOverride ?? storeRef.current;
            const res = await callChannelTodos({
              channelId,
              store: executionStore,
              locale,
              strategyMarkdownOverride:
                freshStrategiesRef.current[channelId]?.markdown,
            });
            const channelDoc = executionStore.channelStrategies[channelId];
            const channelName =
              channelDoc?.channelName ??
              freshStrategiesRef.current[channelId]?.name ??
              channelId;
            const todos: Todo[] = res.todos.map((t, i) => ({
              id: `${channelId}-${t.dayIndex}-${i}-${Date.now()}`,
              channelId,
              channelName,
              dayIndex: t.dayIndex,
              date: addDays(startDate, t.dayIndex - 1),
              time: t.time,
              title: t.title,
              brief: t.brief,
              purpose: t.purpose ?? t.brief,
              pillar: t.pillar ?? t.phase,
              taskType: t.taskType ?? 'content',
              phase: t.phase,
              ...resolveTodoMarket(t, executionStore.targetMarkets),
              status: 'pending',
              launchStatus:
                t.launchStatus ?? (t.dayIndex <= 7 ? 'draft' : 'planned'),
              contentStatus: 'none',
              revision: 1,
            }));
            if (todos.length === 0) {
              throw new Error(isZh ? '任务为空' : 'No todos returned');
            }
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
            succeeded += 1;
            await publishDirectorMessage({
              role: 'assistant',
              content: '',
              card: {
                kind: 'channel_todos',
                channelId,
                channelName,
                todoCount: todos.length,
              },
            });
          } catch (err) {
            await publishDirectorMessage({
              role: 'assistant',
              content: isZh
                ? `${channelId} To-Do 生成失败：${err instanceof Error ? err.message : '未知错误'}`
                : `${channelId} todos failed: ${err instanceof Error ? err.message : 'unknown error'}`,
            });
          } finally {
            finished += 1;
            gtm.patchDirectorMessage(cardMsg.id, {
              card: {
                kind: 'agent-task',
                label: isZh
                  ? `渠道专员正在编写 To-Do（${finished}/${channelIds.length}）…`
                  : `Writing todos (${finished}/${channelIds.length})…`,
                status:
                  finished === channelIds.length
                    ? succeeded > 0
                      ? 'done'
                      : 'error'
                    : 'running',
              },
            });
          }
        })
      );

      if (succeeded > 0) {
        const launch = storeRef.current.launch;
        gtm.update({
          planReady: true,
          ...(launch
            ? {
                launch: {
                  ...launch,
                  project: {
                    ...launch.project,
                    phase: 'active',
                    status: 'active',
                    updatedAt: Date.now(),
                  },
                },
              }
            : {}),
        });
      }

      if (succeeded === channelIds.length) {
        await publishDirectorMessage({
          role: 'assistant',
          content: '',
          card: {
            kind: 'calendar',
            title: isZh ? '30 天行动日历已就绪' : 'Your 30-day calendar is ready',
          },
        });
      } else if (succeeded > 0) {
        await publishDirectorMessage({
          role: 'assistant',
          content: isZh
            ? `${succeeded}/${channelIds.length} 个渠道的 To-Do 已写入日历。失败的渠道可以单独重试。`
            : `${succeeded}/${channelIds.length} channel todo calendars are in place. Retry failed channels individually.`,
        });
      } else {
        gtm.patchDirectorMessage(cardMsg.id, {
          card: {
            kind: 'agent-task',
            label: isZh ? 'To-Do 编写失败' : 'Todo generation failed',
            status: 'error',
          },
        });
      }

      setBackgroundTasks((t) => t.filter((id) => id !== taskId));
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runCreateTodo = useCallback(
    async (
      action: Extract<DirectorAction, { type: 'create_todo' }>,
      agentJobId?: string
    ) => {
      const startDate = storeRef.current.startDate ?? action.date;
      const dayIndex = Math.max(
        1,
        Math.floor(
          (parseDateStr(action.date).getTime() - parseDateStr(startDate).getTime()) /
            86_400_000
        ) + 1
      );
      let todo: Todo = {
        id: crypto.randomUUID(),
        channelId: action.channelId,
        channelName:
          storeRef.current.channelStrategies[action.channelId]?.channelName ??
          action.channelId,
        dayIndex,
        date: action.date,
        time: action.time,
        title: action.title,
        brief: action.brief,
        purpose: action.brief,
        taskType: 'content',
        status: 'pending',
        launchStatus: action.writeNow ? 'generating' : 'planned',
        contentStatus: action.writeNow ? 'writing' : 'none',
        revision: 1,
        ...(() => {
          const market = defaultTargetMarket(storeRef.current.targetMarkets);
          return market
            ? { market: market.name, targetMarketId: market.id, outputLocale: market.locale, audience: market.audience }
            : {};
        })(),
      };
      if (action.writeNow) {
        const written = await callChannelWrite({
          todo,
          store: storeRef.current,
          locale: todo.outputLocale ?? locale,
        });
        todo = {
          ...todo,
          content: written,
          contentStatus: 'ready',
          launchStatus: 'ready',
          contentRevision: 1,
        };
      }
      const { id: _temporaryId, ...todoInput } = todo;
      gtm.createTodo(todoInput);
      if (!storeRef.current.startDate) gtm.update({ startDate });
      await publishDirectorMessage({
        role: 'assistant',
        lane: 'background',
        agentJobId,
        content:
          locale !== 'en'
            ? `已新增 Todo「${todo.title}」，安排在 ${todo.date}${todo.time ? ` ${todo.time}` : ''}${action.writeNow ? '，可发布初稿也已写好' : ''}。`
            : `Created “${todo.title}” for ${todo.date}${todo.time ? ` at ${todo.time}` : ''}${action.writeNow ? ' and prepared the publish-ready draft' : ''}.`,
        card: {
          kind: 'calendar',
          title: locale !== 'en' ? '新 Todo 已进入日历' : 'New todo added to the calendar',
        },
      });
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runWriteArtifact = useCallback(
    async (
      action: Extract<DirectorAction, { type: 'write_artifact' }>,
      agentJobId?: string
    ) => {
      const written = await callArtifactWriter({
        instruction: action.instruction,
        title: action.title,
        artifactType: action.artifactType,
        store: storeRef.current,
        locale,
      });
      const artifact = gtm.createArtifact({
        kind: 'general',
        title: written.title,
        summary: written.summary,
        markdown: written.markdown,
        status: 'draft',
        metadata: {
          artifactType: action.artifactType,
          instruction: action.instruction,
          agentJobId,
        },
      });
      await publishDirectorMessage({
        role: 'assistant',
        lane: 'background',
        agentJobId,
        content:
          locale !== 'en'
            ? `「${artifact.title}」已写好并保存到文档。`
            : `“${artifact.title}” is written and saved in Documents.`,
        card: {
          kind: 'artifact',
          artifactId: artifact.id,
          title: artifact.title,
          summary: artifact.summary,
          status: artifact.status,
        },
      });
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runResearchQuery = useCallback(
    async (
      action: Extract<DirectorAction, { type: 'research_query' }>,
      agentJobId?: string
    ) => {
      const research = await callResearchQuery({
        query: action.query,
        title: action.title,
        maxSources: action.maxSources,
        store: storeRef.current,
        locale,
      });
      const artifact = gtm.createArtifact({
        kind: 'research_report',
        title: research.title,
        summary: research.summary,
        markdown: research.markdown,
        status: 'draft',
        metadata: {
          query: research.query,
          sources: research.sources,
          searchedAt: research.searchedAt,
          agentJobId,
        },
      });
      await publishDirectorMessage({
        role: 'assistant',
        lane: 'background',
        agentJobId,
        content:
          locale !== 'en'
            ? `调研已完成，报告引用了 ${research.sources.length} 个实际检索来源。`
            : `Research complete with ${research.sources.length} retrieved sources.`,
        card: {
          kind: 'artifact',
          artifactId: artifact.id,
          title: artifact.title,
          summary: artifact.summary,
          status: artifact.status,
        },
      });
    },
    [gtm, locale, publishDirectorMessage]
  );

  const runGenerateTopics = useCallback(
    async (
      channelIds: string[],
      count = 7,
      agentJobId?: string,
      options?: { brief?: string; scheduleTodos?: boolean }
    ) => {
      if (
        agentJobId &&
        storeRef.current.artifacts.some(
          (artifact) => artifact.metadata?.agentJobId === agentJobId
        )
      ) {
        return;
      }
      const ids = filterCalendarChannelIds(
        channelIds.length > 0 ? channelIds : storeRef.current.channels
      );
      if (ids.length === 0) return;
      const taskId = `topics-${Date.now()}`;
      setBackgroundTasks((tasks) => [...tasks, taskId]);
      const cardMessage = await publishDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: options?.brief
            ? locale !== 'en'
              ? `正在把新选题适配到 ${ids.length} 个渠道…`
              : `Adapting the new topic for ${ids.length} channels…`
            : `选题规划正在生成 ${count} 个核心选题…`,
          status: 'running',
        },
      });
      try {
        const result = await callTopicPlanner({
          channelIds: ids,
          count,
          brief: options?.brief,
          store: storeRef.current,
          locale,
        });
        if (result.topics.length === 0) {
          throw new Error(
            locale !== 'en'
              ? '选题规划未返回可用内容'
              : 'Topic planning returned no usable topics'
          );
        }
        const scheduleDay = options?.scheduleTodos
          ? chooseTopicScheduleDay(storeRef.current)
          : null;
        let scheduledCount = 0;
        for (const planned of result.topics) {
          const topic = gtm.createTopic({
            title: planned.title,
            source: planned.source,
            targetAudience: planned.targetAudience,
            painPoint: planned.painPoint,
            corePoint: planned.corePoint,
            priority: planned.priority,
            status: scheduleDay ? 'scheduled' : planned.status,
          });
          for (const variant of planned.variants) {
            const topicVariant = gtm.createTopicVariant({
              ...variant,
              topicId: topic.id,
              status: scheduleDay ? 'scheduled' : variant.status,
            });
            if (scheduleDay) {
              gtm.createTodo({
                topicVariantId: topicVariant.id,
                channelId: variant.channelId,
                channelName: variant.channelName,
                dayIndex: scheduleDay.dayIndex,
                date: scheduleDay.date,
                time: chooseTopicScheduleTime(
                  storeRef.current,
                  variant.channelId,
                  scheduleDay.date
                ),
                title: topic.title,
                brief: [
                  `Hook：${variant.hook}`,
                  `角度：${variant.angle}`,
                  variant.format ? `形式：${variant.format}` : '',
                  variant.cta ? `CTA：${variant.cta}` : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
                purpose: topic.corePoint,
                taskType: 'content',
                audience: topic.targetAudience,
                status: 'pending',
                launchStatus: 'draft',
                contentStatus: 'none',
                revision: 1,
              });
              scheduledCount += 1;
            }
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
            scheduledTodoCount: scheduledCount,
            brief: options?.brief,
            agentJobId,
          },
        });
        gtm.patchDirectorMessage(cardMessage.id, {
          card: {
            kind: 'agent-task',
            label: scheduleDay
              ? locale !== 'en'
                ? `新选题已新增 ${scheduledCount} 个渠道 Todo`
                : `New topic added as ${scheduledCount} channel todos`
              : `${result.topics.length} 个核心选题已进入选题库`,
            status: 'done',
          },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content:
            scheduleDay && locale !== 'en'
              ? `已把「${result.topics[0]?.title ?? options?.brief ?? '新选题'}」拆成 ${scheduledCount} 个渠道版本，并追加到 ${scheduleDay.date} 的 Todo。原有日历没有被覆盖。`
              : scheduleDay
                ? `Added “${result.topics[0]?.title ?? options?.brief ?? 'New topic'}” as ${scheduledCount} channel-specific todos on ${scheduleDay.date}. The existing calendar was preserved.`
                : locale !== 'en'
              ? `${result.summary}\n\n完整选题计划已经放到左侧工作区，所有渠道版本也已进入选题库并可继续排期。哪里不对味直接告诉我，我会只修改未来未发布的内容。`
              : `${result.summary}\n\nThe full plan is in the workspace and every channel variant is in the topic library, ready for scheduling. Tell me what feels off and I will change only future unpublished work.`,
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
          label:
            locale !== 'en'
              ? 'Research 正在读取官网、分析竞品并合成 Launch Brief…'
              : 'Research is reading the site, analyzing competitors, and synthesizing the Launch Brief…',
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
        if (result.brief) {
          const currentLaunch = storeRef.current.launch;
          if (currentLaunch) {
            const productName =
              result.product?.name?.trim() &&
              result.product.name !== 'Unknown product'
                ? result.product.name.trim().slice(0, 120)
                : currentLaunch.project.productName;
            gtm.update({
              launch: {
                ...currentLaunch,
                brief: {
                  ...result.brief,
                  revision: (currentLaunch.brief?.revision ?? 0) + 1,
                  updatedAt: Date.now(),
                },
                researchSources: result.sources,
                researchConfidence:
                  result.competitors.length > 0 ? 'high' : 'medium',
                project: {
                  ...currentLaunch.project,
                  productName,
                  phase:
                    currentLaunch.project.phase === 'researching'
                      ? 'brief_ready'
                      : currentLaunch.project.phase,
                  updatedAt: Date.now(),
                },
              },
            });
          }
        }
        const artifact = gtm.createArtifact({
          kind: 'research_report',
          title: locale !== 'en' ? '产品定位与竞品研究' : 'Product & competitor research',
          summary:
            locale !== 'en'
              ? `已读取官网、合成 Launch Brief，并分析 ${result.competitors.length} 个主要竞品。`
              : `Website reviewed, Launch Brief synthesized, and ${result.competitors.length} primary competitors analyzed.`,
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
            briefRevision: result.brief?.revision,
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
          card: {
            kind: 'agent-task',
            label:
              locale !== 'en'
                ? '产品研究与 Launch Brief 已完成'
                : 'Product research and Launch Brief complete',
            status: 'done',
          },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content:
            locale !== 'en'
              ? '研究已经完成，并基于官网证据合成了 Launch Brief。不准确的地方直接告诉我纠正即可。'
              : 'Research is complete and the Launch Brief was synthesized from website evidence. Tell me what to correct.',
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
      const safeProposals = result.evidenceSufficient
        ? result.proposals.filter((proposal) => !proposal.requiresConfirmation)
        : [];
      const confirmationProposals = result.proposals.filter(
        (proposal) => proposal.requiresConfirmation
      );
      let appliedChanges: string[] = [];
      let calendarPatchSummary = '';

      if (safeProposals.length > 0 && storeRef.current.todos.length > 0) {
        const reviewStore = storeRef.current;
        const baseRevision = launchEntityRevision(reviewStore, 'calendar');
        const patchResult = await callLaunchPatch({
          entityType: 'calendar',
          current: reviewStore.todos,
          instruction: `${
            locale !== 'en'
              ? '把以下周复盘建议以最小、可逆的方式应用到未来未完成任务。只调整确有必要的任务；不改变全局定位，不删除大量任务，不执行任何外部动作。'
              : 'Apply these weekly-review proposals to future unfinished tasks using the smallest reversible changes. Do not change global positioning, delete a large set of tasks, or perform an external action.'
          }\n\n${JSON.stringify(safeProposals)}`,
          campaignContext: buildAgentContextEnvelope(reviewStore),
          baseRevision,
          locale,
        });
        if (
          patchResult.baseRevision !==
          launchEntityRevision(storeRef.current, 'calendar')
        ) {
          throw new Error(
            locale !== 'en'
              ? '复盘期间行动日历发生了变化，本次没有覆盖新版本。请重新发起复盘。'
              : 'The calendar changed during the review, so the newer version was not overwritten. Please run the review again.'
          );
        }
        if (!Array.isArray(patchResult.updated)) {
          throw new Error('Weekly review did not return a valid calendar update');
        }
        const originalById = new Map(
          reviewStore.todos.map((todo) => [todo.id, todo])
        );
        const updated = (patchResult.updated as Todo[]).flatMap((candidate) => {
          if (!candidate || typeof candidate.id !== 'string') return [];
          const original = originalById.get(candidate.id);
          if (!original) return [];
          if (original.publishedUrl || original.status === 'done') {
            return [original];
          }
          return [
            {
              ...original,
              ...candidate,
              id: original.id,
              revision: (original.revision ?? 1) + 1,
            },
          ];
        });
        const seen = new Set(updated.map((todo) => todo.id));
        const preserved = reviewStore.todos.filter(
          (todo) => !seen.has(todo.id)
        );
        gtm.update({
          todos: [...updated, ...preserved].sort(
            (a, b) =>
              a.dayIndex - b.dayIndex ||
              (a.time ?? '').localeCompare(b.time ?? '')
          ),
        });
        appliedChanges = safeProposals.map((proposal) => proposal.title);
        calendarPatchSummary = patchResult.summary;
      }

      const currentLaunch = storeRef.current.launch;
      if (currentLaunch) {
        const dueWeek = Math.max(
          1,
          Math.min(4, Math.floor(currentLaunch.project.currentDay / 7))
        );
        const calendarRevision: LaunchRevision | undefined =
          appliedChanges.length > 0
            ? {
                id: crypto.randomUUID(),
                entityType: 'calendar',
                entityId: currentLaunch.project.id,
                label:
                  calendarPatchSummary ||
                  (locale !== 'en'
                    ? '自动应用本周安全调整'
                    : 'Applied safe weekly adjustments'),
                revision: launchEntityRevision(storeRef.current, 'calendar'),
                snapshot: storeRef.current.todos,
                createdAt: Date.now(),
              }
            : undefined;
        gtm.update({
          launch: {
            ...currentLaunch,
            weeklyReviews: currentLaunch.weeklyReviews.map((review) =>
              review.week === dueWeek
                ? {
                    ...review,
                    status: 'applied',
                    summary: result.summary,
                    appliedChanges,
                    channelFindings: result.proposals.map((proposal) => ({
                      channelId: proposal.channelId ?? 'campaign',
                      did: proposal.reason,
                      signal: proposal.expectedSignal,
                      keep: locale !== 'en' ? '保留已有强信号做法' : 'Keep the approaches with stronger signals',
                      change: proposal.title,
                    })),
                    revision: review.revision + 1,
                    createdAt: result.generatedAt,
                  }
                : review
            ),
            revisions: calendarRevision
              ? [...currentLaunch.revisions, calendarRevision].slice(-20)
              : currentLaunch.revisions,
            lastUndoLabel: calendarRevision?.label,
            project: { ...currentLaunch.project, updatedAt: Date.now() },
          },
        });
      }
      const artifact = gtm.createArtifact({
        kind: 'weekly_review',
        title: result.headline,
        summary: result.summary,
        markdown: result.reviewMarkdown,
        status:
          confirmationProposals.length > 0
            ? 'waiting_approval'
            : appliedChanges.length > 0
              ? 'applied'
              : 'draft',
        metadata: {
          proposals: confirmationProposals,
          allProposals: result.proposals,
          appliedChanges,
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
        priority:
          confirmationProposals.length > 0 ? 'important' : 'normal',
      });
      if (cardMessage) {
        gtm.patchDirectorMessage(cardMessage.id, {
          card: { kind: 'agent-task', label: '本周市场复盘已完成', status: 'done' },
        });
        await publishDirectorMessage({
          role: 'assistant',
          content: [
            result.summary,
            appliedChanges.length > 0
              ? locale !== 'en'
                ? `已自动应用 ${appliedChanges.length} 项安全调整到未来未完成任务。`
                : `Applied ${appliedChanges.length} safe adjustment(s) to future unfinished work.`
              : '',
            confirmationProposals.length > 0
              ? locale !== 'en'
                ? `${confirmationProposals.length} 项全局或高风险变化仍在等你确认。`
                : `${confirmationProposals.length} global or high-risk change(s) still require your confirmation.`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
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
        const latest = storeRef.current.todos.find((item) => item.id === todo.id);
        const previousVersion = latest?.contentRevision ?? 1;
        const history = latest?.content
          ? [
              ...(latest.contentHistory ?? []),
              {
                id: crypto.randomUUID(),
                version: previousVersion,
                content: latest.content,
                createdAt: Date.now(),
                reason: feedback,
              },
            ].slice(-10)
          : latest?.contentHistory ?? [];
        gtm.updateTodo(todo.id, {
          content,
          contentStatus: 'ready',
          contentRevision: previousVersion + 1,
          contentHistory: history,
        });
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
          contentRevision: latest.contentRevision ?? 1,
          contentHistory: latest.contentHistory ?? [],
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

  const runUpdateLaunchArtifact = useCallback(
    async (
      action: Extract<DirectorAction, { type: 'update_launch_artifact' }>,
      agentJobId?: string
    ) => {
      const launch = storeRef.current.launch;
      if (!launch) {
        await publishDirectorMessage({ role: 'assistant', content: locale !== 'en' ? '当前还没有可修改的 Launch。请先在左侧导入项目文档，或选择分析产品链接。' : 'There is no launch to edit yet. Import a project document on the left, or choose website analysis.' });
        return;
      }
      const unpaid = !storeRef.current.paid;
      if (unpaid && action.entityType !== 'brief') {
        await publishDirectorMessage({
          role: 'assistant',
          content:
            locale !== 'en'
              ? '支付前只能修改 Launch Brief。完整 Blueprint、渠道计划和任务会在解锁 Agent Team 后生成。'
              : 'Before payment you can only edit the Launch Brief. Blueprint, channel plans, and tasks generate after unlocking the Agent Team.',
        });
        return;
      }
      if (unpaid && action.entityType === 'brief') {
        const used = launch.briefEditUsed ?? 0;
        if (used >= FREE_BRIEF_EDIT_LIMIT) {
          await publishDirectorMessage({
            role: 'assistant',
            content:
              locale !== 'en'
                ? `免费 Brief 修改次数已用完（${FREE_BRIEF_EDIT_LIMIT}/${FREE_BRIEF_EDIT_LIMIT}）。Brief 仍可查看；点击「组建我的 30 天 Agent Team」解锁后可继续。`
                : `Free Brief edits are used up (${FREE_BRIEF_EDIT_LIMIT}/${FREE_BRIEF_EDIT_LIMIT}). The Brief stays readable; unlock the Agent Team to keep editing.`,
          });
          return;
        }
      }
      const current = launchEntityValue(
        storeRef.current,
        action.entityType,
        action.entityId
      );
      if (!current) {
        await publishDirectorMessage({ role: 'assistant', content: locale !== 'en' ? '我没有找到左侧当前对象，暂时没有覆盖任何内容。' : 'I could not find the current object, so nothing was overwritten.' });
        return;
      }

      const taskId = `launch-patch-${Date.now()}`;
      setBackgroundTasks((tasks) => [...tasks, taskId]);
      const card = await publishDirectorMessage({
        role: 'assistant',
        lane: 'background',
        agentJobId,
        content: '',
        card: {
          kind: 'agent-task',
          label: action.entityType === 'calendar'
            ? (locale !== 'en' ? '正在计算日历调整影响范围…' : 'Calculating the calendar impact…')
            : (locale !== 'en' ? '正在更新左侧当前内容…' : 'Updating the current workspace…'),
          status: 'running',
        },
      });
      try {
        const editToken = crypto.randomUUID();
        let patchCurrent = current;
        let baseRevision = launchEntityRevision(
          storeRef.current,
          action.entityType,
          action.entityId
        );
        let result = await callLaunchPatch({
          entityType: action.entityType,
          current: patchCurrent,
          instruction: action.instruction,
          campaignContext: buildAgentContextEnvelope(storeRef.current, {
            channelId: action.entityId,
          }),
          baseRevision,
          channelId: action.entityId,
          locale,
          editToken,
        });
        let latestRevision = launchEntityRevision(
          storeRef.current,
          action.entityType,
          action.entityId
        );
        if (result.baseRevision !== latestRevision) {
          const latestValue = launchEntityValue(
            storeRef.current,
            action.entityType,
            action.entityId
          );
          if (!latestValue) {
            throw new Error(
              locale !== 'en'
                ? '这部分内容已被移除，无法安全合并本次修改。'
                : 'This content was removed, so the edit cannot be merged safely.'
            );
          }
          patchCurrent = latestValue;
          baseRevision = latestRevision;
          result = await callLaunchPatch({
            entityType: action.entityType,
            current: patchCurrent,
            instruction: action.instruction,
            campaignContext: buildAgentContextEnvelope(storeRef.current, {
              channelId: action.entityId,
            }),
            baseRevision,
            channelId: action.entityId,
            locale,
            editToken,
          });
          latestRevision = launchEntityRevision(
            storeRef.current,
            action.entityType,
            action.entityId
          );
          if (result.baseRevision !== latestRevision) {
            throw new Error(
              locale !== 'en'
                ? '这部分内容在合并期间再次更新，本次没有覆盖任何新版本。请重新发送修改要求。'
                : 'This content changed again during the merge. No newer version was overwritten; please retry.'
            );
          }
        }
        const latestLaunch = storeRef.current.launch;
        if (!latestLaunch) throw new Error('Launch no longer exists');
        const revision: LaunchRevision = {
          id: crypto.randomUUID(),
          entityType: action.entityType,
          entityId: action.entityId ?? latestLaunch.project.id,
          label: result.summary,
          revision: baseRevision,
          snapshot: patchCurrent,
          createdAt: Date.now(),
        };
        const revisions = [...latestLaunch.revisions, revision].slice(-20);
        gtm.setMemoryState(
          storeRef.current.conversationSummary,
          [
            {
              id: crypto.randomUUID(),
              category: action.entityType === 'brief' ? 'product' : 'decision',
              key: `launch_${action.entityType}_correction`,
              value: action.instruction.slice(0, 2_000),
              confidence: 1,
              confirmed: true,
              sourceMessageIds: [],
              updatedAt: Date.now(),
            } as MemoryFact,
            ...storeRef.current.memoryFacts.filter(
              (fact) => fact.key !== `launch_${action.entityType}_correction`
            ),
          ].slice(0, 120),
          0
        );
        const briefEditUsed =
          action.entityType === 'brief' && unpaid
            ? typeof result.briefEditUsed === 'number'
              ? result.briefEditUsed
              : (latestLaunch.briefEditUsed ?? 0) + 1
            : latestLaunch.briefEditUsed;
        const baseLaunch = {
          ...latestLaunch,
          revisions,
          lastUndoLabel: result.summary,
          briefEditUsed,
          project: { ...latestLaunch.project, updatedAt: Date.now() },
        };

        if (action.entityType === 'brief' && result.updated && typeof result.updated === 'object' && !Array.isArray(result.updated)) {
          const brief = result.updated as LaunchBrief;
          const nextLaunch = { ...baseLaunch, brief: { ...brief, revision: (latestLaunch.brief?.revision ?? 1) + 1, updatedAt: Date.now() } };
          gtm.update({ launch: nextLaunch });
          // Pre-payment Brief corrections must not regenerate campaign tasks.
          if (!unpaid && storeRef.current.planReady && result.impact !== 'local') {
            await runGenerateTodos(storeRef.current.channels, {
              preservePublished: true,
              storeOverride: { ...storeRef.current, launch: nextLaunch },
            });
          }
        } else if (action.entityType === 'blueprint' && result.updated && typeof result.updated === 'object' && !Array.isArray(result.updated)) {
          const blueprint = result.updated as LaunchBlueprint;
          const nextLaunch = { ...baseLaunch, blueprint: { ...blueprint, revision: (latestLaunch.blueprint?.revision ?? 1) + 1, updatedAt: Date.now() } };
          gtm.update({ launch: nextLaunch });
          if (result.impact === 'global' || result.impact === 'week') {
            await runGenerateTodos(storeRef.current.channels, {
              preservePublished: true,
              storeOverride: { ...storeRef.current, launch: nextLaunch },
            });
          }
        } else if (action.entityType === 'channel_plan' && action.entityId && result.updated && typeof result.updated === 'object' && !Array.isArray(result.updated)) {
          const channelPlan = result.updated as LaunchChannelPlan;
          const nextLaunch = { ...baseLaunch, channelPlans: { ...latestLaunch.channelPlans, [action.entityId]: { ...channelPlan, revision: (latestLaunch.channelPlans[action.entityId]?.revision ?? 1) + 1, updatedAt: Date.now() } } };
          gtm.update({ launch: nextLaunch });
          await runGenerateTodos([action.entityId], {
            preservePublished: true,
            storeOverride: { ...storeRef.current, launch: nextLaunch },
          });
        } else if (action.entityType === 'calendar' && Array.isArray(result.updated)) {
          const originalById = new Map(storeRef.current.todos.map((todo) => [todo.id, todo]));
          const updated = (result.updated as Todo[]).flatMap((candidate) => {
            if (!candidate || typeof candidate.id !== 'string') return [];
            const original = originalById.get(candidate.id);
            if (!original) return [];
            if (original.publishedUrl || original.status === 'done') return [original];
            return [{ ...original, ...candidate, id: original.id, revision: (original.revision ?? 1) + 1 }];
          });
          const seen = new Set(updated.map((todo) => todo.id));
          const preserved = storeRef.current.todos.filter((todo) => !seen.has(todo.id));
          gtm.update({ launch: baseLaunch, todos: [...updated, ...preserved].sort((a, b) => a.dayIndex - b.dayIndex || (a.time ?? '').localeCompare(b.time ?? '')) });
        } else {
          throw new Error('The patch did not match the artifact schema');
        }
        gtm.patchDirectorMessage(card.id, { card: { kind: 'agent-task', label: result.summary, status: 'done' } });
        const remaining =
          typeof result.briefEditRemaining === 'number'
            ? result.briefEditRemaining
            : unpaid && action.entityType === 'brief'
              ? Math.max(0, FREE_BRIEF_EDIT_LIMIT - (briefEditUsed ?? 0))
              : null;
        const quotaNote =
          remaining === null
            ? ''
            : locale !== 'en'
              ? `\n\n已使用免费修改 ${briefEditUsed ?? 0}/${FREE_BRIEF_EDIT_LIMIT}，剩余 ${remaining} 次。`
              : `\n\nFree edits used ${briefEditUsed ?? 0}/${FREE_BRIEF_EDIT_LIMIT}; ${remaining} left.`;
        const nextHint =
          unpaid && action.entityType === 'brief'
            ? locale !== 'en'
              ? '\n\n还可以继续完善目标用户、竞品差异或定位语气；准备好后点击「组建我的 30 天 Agent Team」。'
              : '\n\nYou can still refine audience, competitor differences, or voice. When ready, tap “Assemble my 30-day Agent Team”.'
            : '';
        await publishDirectorMessage({
          role: 'assistant',
          lane: 'background',
          agentJobId,
          content: `${result.summary}${!unpaid && result.impact !== 'local' ? (locale !== 'en' ? `\n\n影响范围：${result.impact}。未来未完成任务已同步更新；已发布内容保持不变。` : `\n\nImpact: ${result.impact}. Future unfinished work was updated; published content was preserved.`) : ''}${quotaNote}${nextHint}\n\n${locale !== 'en' ? '需要撤回时直接说“撤销刚才的修改”。' : 'Say “undo that change” if you want to revert it.'}`,
        });
      } catch (error) {
        gtm.patchDirectorMessage(card.id, { card: { kind: 'agent-task', label: `${locale !== 'en' ? '修改失败' : 'Update failed'}：${error instanceof Error ? error.message : 'Unknown error'}`, status: 'error' } });
      } finally {
        setBackgroundTasks((tasks) => tasks.filter((id) => id !== taskId));
      }
    },
    [gtm, locale, publishDirectorMessage, runGenerateTodos]
  );

  const runUndoLaunchChange = useCallback(async (agentJobId?: string) => {
    const launch = storeRef.current.launch;
    const revision = launch?.revisions.at(-1);
    if (!launch || !revision) {
      await publishDirectorMessage({ role: 'assistant', lane: 'background', agentJobId, content: locale !== 'en' ? '目前没有可撤销的 Launch 修改。' : 'There is no Launch change to undo.' });
      return;
    }
    const nextLaunch = { ...launch, revisions: launch.revisions.slice(0, -1), lastUndoLabel: undefined, project: { ...launch.project, updatedAt: Date.now() } };
    if (revision.entityType === 'brief') nextLaunch.brief = revision.snapshot as LaunchBrief;
    else if (revision.entityType === 'blueprint') nextLaunch.blueprint = revision.snapshot as LaunchBlueprint;
    else if (revision.entityType === 'channel_plan') nextLaunch.channelPlans = { ...launch.channelPlans, [revision.entityId]: revision.snapshot as LaunchChannelPlan };
    if (revision.entityType === 'calendar') gtm.update({ launch: nextLaunch, todos: revision.snapshot as Todo[] });
    else gtm.update({ launch: nextLaunch });
    await publishDirectorMessage({ role: 'assistant', lane: 'background', agentJobId, content: locale !== 'en' ? `已撤销：${revision.label}` : `Undone: ${revision.label}` });
  }, [gtm, locale, publishDirectorMessage]);

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
        if (action.type === 'recommend_channels') {
          await runRecommendChannels(action.feedback);
        } else if (action.type === 'select_channels') {
          await runSelectChannels(action.channelIds);
        } else if (action.type === 'generate_channel_plans') {
          await runGenerateChannelPlans(
            action.channelIds,
            action.force === true
          );
        } else if (action.type === 'generate_strategy') {
          await runGenerateStrategy(action.channelIds, action.feedback);
        } else if (action.type === 'generate_todos') {
          // 首次排期必须覆盖用户已确认的全部渠道（LLM 只带部分渠道时补全）；
          // 已有 To-Do 后（新增/调整渠道）只处理指定渠道
          const hasTodos = storeRef.current.todos.length > 0;
          const ids = hasTodos && action.channelIds.length > 0
            ? action.channelIds
            : [...new Set([...action.channelIds, ...storeRef.current.channels])];
          if (ids.length > 0) await runGenerateTodos(ids);
        } else if (action.type === 'create_todo') {
          await runCreateTodo(action, executionId);
        } else if (action.type === 'write_artifact') {
          await runWriteArtifact(action, executionId);
        } else if (action.type === 'research_query') {
          await runResearchQuery(action, executionId);
        } else if (action.type === 'generate_topics') {
          await runGenerateTopics(
            action.channelIds,
            action.count ?? 7,
            executionId,
            {
              brief: action.brief,
              scheduleTodos: action.scheduleTodos,
            }
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
            action.feedback
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
        } else if (action.type === 'update_launch_artifact') {
          await runUpdateLaunchArtifact(action, executionId);
        } else if (action.type === 'undo_launch_change') {
          await runUndoLaunchChange(executionId);
        }
      }
    },
    [
      locale,
      publishDirectorMessage,
      runRecommendChannels,
      runSelectChannels,
      runGenerateChannelPlans,
      runGenerateStrategy,
      runGenerateTodos,
      runCreateTodo,
      runWriteArtifact,
      runResearchQuery,
      runGenerateTopics,
      runGenerateTodoContent,
      runProductResearch,
      runUndoLaunchChange,
      runUpdateLaunchArtifact,
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

            const syncRemote = async () => {
              try {
                const response = await fetch('/api/gtm/state', {
                  cache: 'no-store',
                });
                if (!response.ok) return;
                const payload = (await response.json()) as {
                  store?: GtmStore;
                  revision?: string;
                };
                if (payload.store) {
                  gtm.adoptRemoteStore(payload.store, payload.revision);
                }
              } catch {
                // Keep polling the work endpoint even if state sync fails.
              }
            };

            const pollServerJob = async (serverJobId: string) => {
              await withPollLock(async () => {
                for (;;) {
                  if (!mountedRef.current) return;
                  const { job } = await pollAgentWork(serverJobId);
                  await syncRemote();
                  if (!job || job.status === 'completed') {
                    releaseServerJobPointer(serverJobId);
                    return;
                  }
                  if (job.status === 'failed' || job.status === 'cancelled') {
                    // The pointer stays so the user can resume the same job.
                    throw new Error(
                      job.last_error ||
                        (locale !== 'en'
                          ? '后台任务失败'
                          : 'Background job failed')
                    );
                  }
                  await wait(2500);
                }
              });
            };

            // Prefer durable server execution so tab sleep / refresh / offline
            // cron can keep draining the same queue.
            const activeServerJob =
              storeRef.current.launch?.activeAgentWorkJob?.jobId ||
              storeRef.current.launch?.channelPlanJob?.jobId;
            if (activeServerJob) {
              await pollServerJob(activeServerJob);
              await syncRemote();
              return;
            }

            const isZh = locale !== 'en';
            const label = defaultWorkLabel(actions, isZh);
            const cardMsg = await publishDirectorMessage({
              role: 'assistant',
              lane: 'background',
              agentJobId: jobId,
              content: '',
              card: {
                kind: 'agent-task',
                label,
                status: 'running',
              },
            });

            try {
              const enqueued = await enqueueAgentWork({
                actions,
                store: storeRef.current,
                locale,
                taskMessageId: cardMsg.id,
                label,
                buildKey: `work:${jobId}`,
              });
              if (enqueued.skipped || !enqueued.job) {
                gtm.patchDirectorMessage(cardMsg.id, {
                  card: {
                    kind: 'agent-task',
                    label: isZh ? '后台任务已完成' : 'Background work done',
                    status: 'done',
                  },
                });
                return;
              }
              const launch = storeRef.current.launch;
              if (launch) {
                gtm.update({
                  launch: {
                    ...launch,
                    activeAgentWorkJob: {
                      jobId: enqueued.job.id,
                      taskMessageId: cardMsg.id,
                      label,
                      completedCount: enqueued.job.progress_completed,
                      totalCount: enqueued.job.progress_total,
                      updatedAt: Date.now(),
                    },
                    project: { ...launch.project, updatedAt: Date.now() },
                  },
                });
              }
              await pollServerJob(enqueued.job.id);
              await syncRemote();
              return;
            } catch (error) {
              const message = error instanceof Error ? error.message : '';
              // Local demo / unpaid: keep the previous in-browser workers.
              if (!/unauthorized|401|403/i.test(message)) {
                gtm.patchDirectorMessage(cardMsg.id, {
                  card: {
                    kind: 'agent-task',
                    label: isZh
                      ? `后台任务失败：${message || '未知错误'}`
                      : `Background job failed: ${message || 'unknown error'}`,
                    status: 'error',
                  },
                });
                throw error;
              }
              gtm.patchDirectorMessage(cardMsg.id, {
                card: {
                  kind: 'agent-task',
                  label: isZh
                    ? '改用本地执行…'
                    : 'Falling back to local execution…',
                  status: 'running',
                },
              });
            }

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
          // A Todo enters `writing` optimistically when it is queued. Only a
          // real queue/worker failure should return it to `none`, which lets
          // the detail page offer Retry without showing a false failure while
          // background work is still running.
          for (const action of actions) {
            if (
              action.type !== 'generate_todo_content' &&
              action.type !== 'rewrite_todo_content'
            ) {
              continue;
            }
            const todo = storeRef.current.todos.find(
              (item) => item.id === action.todoId
            );
            if (todo?.contentStatus === 'writing') {
              gtm.updateTodo(action.todoId, { contentStatus: 'none' });
            }
          }
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
    [
      gtm,
      locale,
      publishDirectorMessage,
      releaseServerJobPointer,
      runActions,
      withPollLock,
    ]
  );

  // Resume Worker commands that were already accepted before a refresh.
  useEffect(() => {
    if (!gtm.hydrated) return;
    for (const job of gtm.store.agentActionJobs) {
      scheduleActions(job.actions, job.sourceMessageIds, job.id);
    }
  }, [gtm.hydrated, gtm.store.agentActionJobs, scheduleActions]);

  // Reattach when only the durable server pointer survived.
  useEffect(() => {
    if (!gtm.hydrated) return;
    const serverJob =
      gtm.store.launch?.activeAgentWorkJob?.jobId ||
      gtm.store.launch?.channelPlanJob?.jobId;
    if (!serverJob) {
      channelPlanResumeRef.current = null;
      return;
    }
    if (channelPlanResumeRef.current === serverJob) return;
    channelPlanResumeRef.current = serverJob;
    scheduleActions(
      gtm.store.agentActionJobs[0]?.actions ?? [
        {
          type: 'generate_channel_plans',
          channelIds:
            gtm.store.launch?.channelPlanJob?.channelIds ??
            gtm.store.channels,
        },
      ],
      gtm.store.agentActionJobs[0]?.sourceMessageIds ?? [],
      gtm.store.agentActionJobs[0]?.id
    );
  }, [
    gtm.hydrated,
    gtm.store.agentActionJobs,
    gtm.store.channels,
    gtm.store.launch?.activeAgentWorkJob?.jobId,
    gtm.store.launch?.channelPlanJob?.jobId,
    gtm.store.launch?.channelPlanJob?.channelIds,
    scheduleActions,
  ]);

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

            const actions = res.actions ?? [];
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

      if (selected.includes('generate_todos_yes')) {
        const channelIds = withFixedDirectory(
          storeRef.current.launch?.selectedChannelIds ??
            storeRef.current.channels
        );
        void scheduleActions(
          [{ type: 'generate_todos', channelIds }],
          [messageId],
          `generate-todos-${messageId}`
        );
        return;
      }
      if (selected.includes('generate_todos_later')) {
        void publishDirectorMessage({
          role: 'assistant',
          content:
            locale !== 'en'
              ? '好的，稍后你说一声再生成 Todo。也可以随时让我为某一个渠道单独写计划或 Todo。记得去 Directory 提交产品信息。'
              : 'Sure—say the word when you want todos. You can also ask me to write a plan or todos for one channel. Don’t forget Directory submission.',
        });
        return;
      }

      const looksLikeChannelPick = selected.every((id) =>
        card.options.some((o) => o.id === id)
      );
      const channelIdsFromCard = selected.filter((id) =>
        card.options.some((o) => o.id === id && !id.startsWith('generate_'))
      );
      if (
        looksLikeChannelPick &&
        channelIdsFromCard.length > 0 &&
        card.question.toLowerCase().includes('渠道')
      ) {
        void scheduleActions(
          [
            { type: 'select_channels', channelIds: channelIdsFromCard },
            { type: 'generate_channel_plans', channelIds: channelIdsFromCard },
          ],
          [messageId],
          `select-and-plan-${messageId}`
        );
        return;
      }
      if (
        looksLikeChannelPick &&
        channelIdsFromCard.length > 0 &&
        card.question.toLowerCase().includes('channel')
      ) {
        void scheduleActions(
          [
            { type: 'select_channels', channelIds: channelIdsFromCard },
            { type: 'generate_channel_plans', channelIds: channelIdsFromCard },
          ],
          [messageId],
          `select-and-plan-${messageId}`
        );
        return;
      }

      void send(`我的选择：${labels.join('、')}`, {
        fromOptionCard: true,
        selectedIds: selected,
      });
    },
    [gtm, locale, publishDirectorMessage, scheduleActions, send]
  );

  /** Submit the remaining onboarding/research kickoff cards. */
  const submitKickoff = useCallback(
    async (
      messageId: string,
      card: KickoffCard,
      answers: Record<string, string[]>,
      productUrl?: string
    ) => {
      const trimmedUrl = productUrl?.trim();
      gtm.patchDirectorMessage(messageId, {
        card: {
          kind: 'kickoff',
          card: {
            ...card,
            answered: answers,
            ...(trimmedUrl ? { productUrl: trimmedUrl } : {}),
          },
        },
      });

      if (trimmedUrl) {
        await runProductResearch(trimmedUrl);
      }
      void send(formatKickoffAnswers(card, answers, locale !== 'en', trimmedUrl));
    },
    [gtm, locale, send, runProductResearch, scheduleActions]
  );

  const submitDirectoryMaterials = useCallback(
    (
      messageId: string,
      card: DirectoryMaterialsCard,
      values: Partial<Record<DirectoryMaterialKey, string>>
    ) => {
      const launch = storeRef.current.launch;
      if (!launch) return;
      const kit = applyDirectoryMaterialValues(
        buildDirectoryLaunchKit(launch),
        values
      );
      gtm.update({
        launch: {
          ...launch,
          directoryLaunchKit: kit,
          project: { ...launch.project, updatedAt: Date.now() },
        },
      });
      gtm.patchDirectorMessage(messageId, {
        card: {
          kind: 'directory_materials',
          card: { ...card, savedAt: Date.now() },
        },
      });
      gtm.addDirectorMessage({
        role: 'assistant',
        content:
          locale !== 'en'
            ? '已保存到 Directory 提交资料库。之后每个平台会直接复用；如果某个平台还有特殊要求，我再只追问缺少的部分。'
            : 'Saved to the directory submission library. Every platform can reuse it; if one has a special requirement, I will only ask for the missing detail.',
      });
    },
    [gtm, locale]
  );

  return {
    send,
    submitOptions,
    submitKickoff,
    submitDirectoryMaterials,
    /** Backwards-compatible name for existing UI. */
    sending: processing,
    processing,
    pendingCount,
    busy:
      processing ||
      pendingCount > 0 ||
      backgroundTasks.length > 0 ||
      gtm.store.agentActionJobs.length > 0 ||
      Boolean(gtm.store.launch?.channelPlanJob?.jobId) ||
      Boolean(gtm.store.launch?.activeAgentWorkJob?.jobId),
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

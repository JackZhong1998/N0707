import 'server-only';

import { runChannelRecommender } from '@/lib/agents/channel-recommender';
import { runProductResearch } from '@/lib/agents/researcher';
import { runWeeklyReflection } from '@/lib/agents/reflection';
import { runChannelTodos, runChannelWrite } from '@/lib/agents/specialist';
import { runStrategist } from '@/lib/agents/strategist';
import { runTopicPlanner } from '@/lib/agents/topic-planner';
import { buildAgentContextEnvelope } from './agent-context';
import {
  claimAgentWorkJob,
  claimAgentWorkStep,
  completeAgentWorkJob,
  completeAgentWorkStep,
  failAgentWorkStep,
  listAgentWorkSteps,
  releaseAgentWorkJob,
  type AgentWorkJobRecord,
  type AgentWorkStepRecord,
} from './agent-work-jobs';
import { loadGtmStore, saveGtmStoreWithConflictRetry } from './database';
import { addDays } from './dates';
import { channelHasCalendarTodos } from './channel-capabilities';
import {
  applyStrategyToChannelPlans,
  buildLaunchBrief,
  createBriefResearchSteps,
  SUPPORTED_LAUNCH_CHANNELS,
} from './launch';
import { buildPerformanceContext } from './post-metrics';
import {
  buildChannelSelectOptionCard,
  withFixedDirectory,
} from './post-pay-profile';
import type {
  ChatMessage,
  GtmStore,
  LaunchChannelPlan,
  Todo,
} from './types';

function conversationDigest(store: GtmStore): string {
  return store.directorChat
    .slice(-14)
    .map(
      (message) =>
        `${message.role === 'user' ? '用户' : '市场总监'}：${message.content.slice(0, 200)}`
    )
    .join('\n');
}

function appendDirectorMessage(
  store: GtmStore,
  message: Omit<ChatMessage, 'id' | 'createdAt'> & { id?: string }
): GtmStore {
  const next: ChatMessage = {
    id: message.id ?? crypto.randomUUID(),
    createdAt: Date.now(),
    role: message.role,
    content: message.content,
    ...(message.card ? { card: message.card } : {}),
    ...(message.lane ? { lane: message.lane } : {}),
    ...(message.agentJobId ? { agentJobId: message.agentJobId } : {}),
  };
  return {
    ...store,
    directorChat: [...store.directorChat, next],
    updatedAt: Date.now(),
  };
}

function patchTaskProgress(
  store: GtmStore,
  job: AgentWorkJobRecord,
  steps: AgentWorkStepRecord[]
): GtmStore {
  const taskMessageId =
    typeof job.meta.taskMessageId === 'string' ? job.meta.taskMessageId : '';
  if (!taskMessageId) return store;
  const total = steps.length;
  const finished = steps.filter((step) =>
    ['completed', 'skipped'].includes(step.status)
  ).length;
  const failed = steps.some((step) => step.status === 'failed');
  const allDone = finished === total && total > 0;
  const isZh = job.locale === 'zh';
  const label = allDone
    ? isZh
      ? `后台任务已完成（${finished}/${total}）`
      : `Background work done (${finished}/${total})`
    : isZh
      ? `后台任务进行中（${finished}/${total}）…`
      : `Background work (${finished}/${total})…`;

  return {
    ...store,
    directorChat: store.directorChat.map((message) =>
      message.id === taskMessageId
        ? {
            ...message,
            agentJobId: job.id,
            card: {
              kind: 'agent-task' as const,
              label,
              status: failed ? 'error' : allDone ? 'done' : 'running',
            },
          }
        : message
    ),
    launch: store.launch
      ? {
          ...store.launch,
          activeAgentWorkJob: allDone
            ? undefined
            : {
                jobId: job.id,
                taskMessageId,
                label,
                completedCount: finished,
                totalCount: total,
                updatedAt: Date.now(),
              },
          project: { ...store.launch.project, updatedAt: Date.now() },
        }
      : store.launch,
    updatedAt: Date.now(),
  };
}

function applyChannelStrategy(
  store: GtmStore,
  channelId: string,
  channel: {
    channelId: string;
    channelName: string;
    positioning: string;
    direction: string;
    contentPillars: string[];
    markdown: string;
  },
  jobId: string,
  isZh: boolean
): GtmStore {
  const next: GtmStore = {
    ...store,
    channelStrategies: {
      ...store.channelStrategies,
      [channelId]: {
        channelId: channel.channelId,
        channelName: channel.channelName,
        positioning: channel.positioning,
        direction: channel.direction,
        contentPillars: channel.contentPillars,
        markdown: channel.markdown,
        updatedAt: Date.now(),
      },
    },
    updatedAt: Date.now(),
  };
  if (next.launch) {
    const plan = next.launch.channelPlans[channelId];
    const patchedPlans = applyStrategyToChannelPlans(
      next.launch,
      {
        goal: next.strategy?.goal ?? '',
        overviewMarkdown: next.strategy?.overviewMarkdown ?? '',
        channels: [channel],
      },
      isZh
    );
    const updatedPlan: LaunchChannelPlan | undefined = patchedPlans[channelId]
      ? { ...patchedPlans[channelId], status: 'ready' }
      : plan
        ? {
            ...plan,
            mission: channel.positioning || plan.mission,
            whyItMatters: channel.direction || plan.whyItMatters,
            pillars: channel.contentPillars.length
              ? channel.contentPillars
              : plan.pillars,
            status: 'ready',
            updatedAt: Date.now(),
          }
        : undefined;
    next.launch = {
      ...next.launch,
      channelPlans: updatedPlan
        ? { ...next.launch.channelPlans, [channelId]: updatedPlan }
        : next.launch.channelPlans,
      project: { ...next.launch.project, updatedAt: Date.now() },
    };
  }
  const hasCard = next.directorChat.some(
    (message) =>
      message.card?.kind === 'channel_plan' &&
      message.card.channelId === channelId
  );
  if (!hasCard) {
    return appendDirectorMessage(next, {
      role: 'assistant',
      content: '',
      lane: 'background',
      agentJobId: jobId,
      card: {
        kind: 'channel_plan',
        channelId: channel.channelId,
        channelName: channel.channelName,
      },
    });
  }
  return next;
}

/**
 * Directory is executed through the submission pipeline, so it never gets
 * calendar todos: drop any left from earlier runs and hand the user the link.
 */
function finishDirectoryPipelineStep(
  store: GtmStore,
  job: AgentWorkJobRecord,
  channelId: string,
  isZh: boolean
): { result: unknown; store: GtmStore } {
  const todos = store.todos.filter((todo) => todo.channelId !== channelId);
  const pendingCount = (store.launch?.directories ?? []).filter(
    (directory) =>
      !['submitted', 'under_review', 'published', 'unavailable'].includes(
        directory.status
      )
  ).length;
  let next: GtmStore =
    todos.length === store.todos.length
      ? store
      : { ...store, todos, updatedAt: Date.now() };
  next = appendDirectorMessage(next, {
    role: 'assistant',
    lane: 'background',
    agentJobId: job.id,
    content: isZh
      ? '产品目录不排 Todo — 提交进度在 Directory 页跟踪，打开就能继续提交。'
      : 'Directories are not scheduled as todos — open the Directory page to keep submitting.',
    card: { kind: 'directory_pipeline', pendingCount },
  });
  return { result: { skipped: 'directory_pipeline', pendingCount }, store: next };
}

async function executeStep(
  job: AgentWorkJobRecord,
  step: AgentWorkStepRecord
): Promise<{ result: unknown; store: GtmStore }> {
  const { store: latest } = await loadGtmStore(job.clerk_user_id);
  let store: GtmStore = structuredClone(latest);
  const isZh = job.locale === 'zh';
  const payload = step.action_payload ?? {};

  if (step.step_type === 'noop') {
    return { result: { skipped: true }, store };
  }

  if (step.step_type === 'select_channels') {
    const channelIds = Array.isArray(payload.channelIds)
      ? payload.channelIds.filter((id): id is string => typeof id === 'string')
      : [];
    const selected = withFixedDirectory(channelIds);
    store = {
      ...store,
      channels: selected,
      launch: store.launch
        ? {
            ...store.launch,
            selectedChannelIds: selected,
            project: { ...store.launch.project, updatedAt: Date.now() },
          }
        : store.launch,
      updatedAt: Date.now(),
    };
    return { result: { channelIds: selected }, store };
  }

  if (step.step_type === 'recommend_channels') {
    const result = await runChannelRecommender({
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      conversationDigest: conversationDigest(store),
      campaignContext: buildAgentContextEnvelope(store),
      locale: job.locale,
      feedback:
        typeof payload.feedback === 'string' ? payload.feedback : undefined,
    });
    if (store.launch) {
      store = {
        ...store,
        launch: {
          ...store.launch,
          channelRecommendations: result,
          project: { ...store.launch.project, updatedAt: Date.now() },
        },
        updatedAt: Date.now(),
      };
    }
    store = appendDirectorMessage(store, {
      role: 'assistant',
      content: isZh
        ? '渠道推荐已经写进左侧「文档」。点击下方卡片可查看完整诊断与优先级；Directory（产品目录提交）是固定能力，不用勾选——稍后我会引导你去提交。请先在选项卡里选择本轮要做的渠道。'
        : 'Recommendations are in Documents—tap the card below for the full diagnosis and priorities. Directory publishing is always on—I’ll guide you to submit later. Pick channels for this round in the options card.',
      lane: 'background',
      agentJobId: job.id,
      card: {
        kind: 'channel_recommendations',
        title: isZh ? '渠道推荐已就绪' : 'Channel recommendations ready',
      },
    });
    const selectCard = buildChannelSelectOptionCard(result.recommendations, isZh);
    const hasSelectCard = store.directorChat.some(
      (message) =>
        message.agentJobId === job.id &&
        message.card?.kind === 'options' &&
        message.card.card.question === selectCard.question
    );
    if (selectCard.options.length > 0 && !hasSelectCard) {
      store = appendDirectorMessage(store, {
        role: 'assistant',
        content: isZh ? '选择渠道' : 'Select channels',
        lane: 'background',
        agentJobId: job.id,
        card: { kind: 'options', card: selectCard },
      });
    }
    return { result: { recommendationCount: result.recommendations.length }, store };
  }

  if (
    step.step_type === 'channel_strategy' ||
    step.step_type === 'strategy_blueprint'
  ) {
    const channelId =
      step.channel_id ||
      (typeof payload.channelId === 'string' ? payload.channelId : '');
    const channelIds =
      step.step_type === 'strategy_blueprint'
        ? (store.launch?.selectedChannelIds?.length
            ? store.launch.selectedChannelIds
            : store.channels.length
              ? store.channels
              : SUPPORTED_LAUNCH_CHANNELS.map((c) => c.channelId)
          ).slice(0, 8)
        : channelId
          ? [channelId]
          : [];
    if (channelIds.length === 0) {
      throw new Error('channel strategy step missing channel id');
    }
    const strategy = await runStrategist({
      channelIds,
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      conversationDigest: conversationDigest(store),
      performanceContext: buildPerformanceContext(store.todos),
      existingOverview: store.strategy?.overviewMarkdown,
      feedback:
        typeof payload.feedback === 'string' ? payload.feedback : undefined,
      campaignContext: buildAgentContextEnvelope(store, {
        channelId: channelId || undefined,
      }),
      locale: job.locale,
      phase: step.step_type === 'strategy_blueprint' ? 'blueprint' : 'channel',
    });
    if (strategy.overviewMarkdown) {
      store = {
        ...store,
        strategy: {
          goal: strategy.goal,
          overviewMarkdown: strategy.overviewMarkdown,
          updatedAt: Date.now(),
        },
      };
    }
    for (const channel of strategy.channels) {
      store = applyChannelStrategy(
        store,
        channel.channelId,
        channel,
        job.id,
        isZh
      );
    }
    return { result: { channels: strategy.channels.map((c) => c.channelId) }, store };
  }

  if (step.step_type === 'channel_plans_finalize') {
    const hasTodosPrompt = store.directorChat.some(
      (message) =>
        message.agentJobId === job.id &&
        message.card?.kind === 'options' &&
        message.card.card.options.some((option) =>
          option.id.startsWith('generate_todos')
        )
    );
    if (!hasTodosPrompt) {
      store = appendDirectorMessage(store, {
        role: 'assistant',
        lane: 'background',
        agentJobId: job.id,
        content: isZh
          ? '渠道计划已全部返回。可在左侧「文档」查看详情。需要我为这些渠道生成 Todo 吗？'
          : 'All channel plans are back—open Documents for details. Generate todos for these channels?',
      });
      store = appendDirectorMessage(store, {
        role: 'assistant',
        lane: 'background',
        agentJobId: job.id,
        content: isZh ? '是否生成 Todo？' : 'Generate todos?',
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
    }
    if (store.launch) {
      store = {
        ...store,
        launch: {
          ...store.launch,
          channelPlanJob: undefined,
          project: { ...store.launch.project, updatedAt: Date.now() },
        },
      };
    }
    return { result: { finalized: true }, store };
  }

  if (step.step_type === 'channel_todos' || step.step_type === 'directory_pipeline') {
    const channelId =
      step.channel_id ||
      (typeof payload.channelId === 'string' ? payload.channelId : '');
    if (!channelId) throw new Error('channel todos step missing channel id');
    if (!channelHasCalendarTodos(channelId)) {
      return finishDirectoryPipelineStep(store, job, channelId, isZh);
    }
    const definition = SUPPORTED_LAUNCH_CHANNELS.find(
      (channel) => channel.channelId === channelId
    );
    if (!definition) throw new Error(`Unsupported channel ${channelId}`);
    const result = await runChannelTodos({
      channelId,
      channelStrategyMarkdown:
        store.channelStrategies[channelId]?.markdown ?? '',
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      campaignContext: buildAgentContextEnvelope(store, { channelId }),
      locale: job.locale,
    });
    const startDate =
      store.startDate ||
      store.launch?.project.startDate ||
      new Date().toISOString().slice(0, 10);
    const preservePublished = payload.preservePublished === true;
    const kept = preservePublished
      ? store.todos.filter(
          (todo) =>
            todo.channelId !== channelId || todo.launchStatus === 'published'
        )
      : store.todos.filter((todo) => todo.channelId !== channelId);
    const generated: Todo[] = result.todos.map((todo, todoIndex) => ({
      id: `${channelId}-${todo.dayIndex}-${todoIndex}-${job.id.slice(0, 8)}`,
      channelId,
      channelName: isZh ? definition.name : definition.nameEn,
      dayIndex: todo.dayIndex,
      date: addDays(startDate, todo.dayIndex - 1),
      time: todo.time,
      title: todo.title,
      brief: todo.brief,
      purpose: todo.purpose ?? todo.brief,
      pillar: todo.pillar ?? todo.phase,
      taskType: todo.taskType ?? 'content',
      phase: todo.phase,
      market: todo.market,
      audience: todo.audience,
      status: 'pending',
      launchStatus:
        todo.launchStatus ?? (todo.dayIndex <= 7 ? 'draft' : 'planned'),
      contentStatus: 'none',
      revision: 1,
    }));
    store = {
      ...store,
      todos: [...kept, ...generated].sort(
        (left, right) =>
          left.dayIndex - right.dayIndex ||
          (left.time ?? '').localeCompare(right.time ?? '')
      ),
      planReady: true,
      startDate,
      updatedAt: Date.now(),
    };
    store = appendDirectorMessage(store, {
      role: 'assistant',
      content: '',
      lane: 'background',
      agentJobId: job.id,
      card: {
        kind: 'channel_todos',
        channelId,
        channelName: isZh ? definition.name : definition.nameEn,
        todoCount: generated.length,
      },
    });
    return { result: { todoCount: generated.length }, store };
  }

  if (step.step_type === 'generate_topics') {
    const channelIds = Array.isArray(payload.channelIds)
      ? payload.channelIds.filter((id): id is string => typeof id === 'string')
      : store.channels;
    const count =
      typeof payload.count === 'number' && Number.isFinite(payload.count)
        ? Math.max(1, Math.min(30, Math.round(payload.count)))
        : 7;
    const result = await runTopicPlanner({
      channelIds,
      count,
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      strategyMarkdown: store.strategy?.overviewMarkdown ?? '',
      channelStrategyMarkdown: Object.fromEntries(
        channelIds.map((id) => [id, store.channelStrategies[id]?.markdown ?? ''])
      ),
      performanceContext: buildPerformanceContext(store.todos),
      campaignContext: buildAgentContextEnvelope(store),
      locale: job.locale,
    });
    const now = Date.now();
    const topics = result.topics.map((planned) => ({
      id: crypto.randomUUID(),
      title: planned.title,
      source: planned.source,
      targetAudience: planned.targetAudience,
      painPoint: planned.painPoint,
      corePoint: planned.corePoint,
      priority: planned.priority,
      status: planned.status,
      createdAt: now,
      updatedAt: now,
    }));
    const topicVariants = result.topics.flatMap((planned, index) => {
      const topicId = topics[index]?.id;
      if (!topicId) return [];
      return planned.variants.map((variant) => ({
        id: crypto.randomUUID(),
        topicId,
        channelId: variant.channelId,
        channelName: variant.channelName,
        hook: variant.hook,
        angle: variant.angle,
        format: variant.format,
        cta: variant.cta,
        status: variant.status,
        createdAt: now,
        updatedAt: now,
      }));
    });
    store = {
      ...store,
      topics: [...store.topics, ...topics],
      topicVariants: [...store.topicVariants, ...topicVariants],
      artifacts: [
        ...store.artifacts,
        {
          id: crypto.randomUUID(),
          kind: 'topic_plan' as const,
          title: result.title || (isZh ? '选题计划' : 'Topic plan'),
          summary: result.summary,
          markdown: result.markdown,
          status: 'draft' as const,
          version: 1,
          createdAt: now,
          updatedAt: now,
          metadata: {
            channelIds,
            topicCount: topics.length,
            agentJobId: job.id,
          },
        },
      ],
      updatedAt: now,
    };
    return {
      result: {
        topicCount: topics.length,
        variantCount: topicVariants.length,
      },
      store,
    };
  }

  if (step.step_type === 'research_product') {
    const websiteUrl =
      typeof payload.websiteUrl === 'string' ? payload.websiteUrl.trim() : '';
    if (!websiteUrl) throw new Error('research_product missing websiteUrl');
    if (store.launch) {
      store = {
        ...store,
        launch: {
          ...store.launch,
          researchProgress: createBriefResearchSteps(isZh).map((stepItem, index) => ({
            ...stepItem,
            status: index === 0 ? 'running' : 'pending',
          })),
          project: {
            ...store.launch.project,
            phase: 'researching',
            status: 'building',
            updatedAt: Date.now(),
          },
        },
      };
      await saveGtmStoreWithConflictRetry(job.clerk_user_id, store);
    }
    const research = await runProductResearch({
      websiteUrl,
      locale: job.locale,
    });
    if (!store.launch) {
      return { result: { productName: research.product.name }, store };
    }
    const brief = buildLaunchBrief(store.launch, research, isZh);
    store = {
      ...store,
      projectProfileDoc:
        research.productProfileMarkdown || store.projectProfileDoc,
      launch: {
        ...store.launch,
        brief,
        researchProgress: createBriefResearchSteps(isZh).map((item) => ({
          ...item,
          status: 'done' as const,
        })),
        researchConfidence: 'medium',
        researchSources: research.sources,
        project: {
          ...store.launch.project,
          productName:
            research.product.name || store.launch.project.productName,
          productUrl: websiteUrl,
          phase: 'brief_ready',
          status: 'active',
          updatedAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    };
    return { result: { productName: research.product.name }, store };
  }

  if (step.step_type === 'weekly_review') {
    const result = await runWeeklyReflection({
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      strategyMarkdown: store.strategy?.overviewMarkdown ?? '',
      performanceContext: buildPerformanceContext(store.todos),
      campaignContext: buildAgentContextEnvelope(store),
      locale: job.locale,
    });
    store = {
      ...store,
      lastReflectionAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (store.launch && result.summary) {
      store = {
        ...store,
        launch: {
          ...store.launch,
          weeklyReviews: [
            ...store.launch.weeklyReviews,
            {
              id: crypto.randomUUID(),
              week: store.launch.weeklyReviews.length + 1,
              status: 'ready',
              summary: result.summary,
              channelFindings: [],
              appliedChanges: result.proposals.map((proposal) => proposal.title),
              revision: 1,
              createdAt: Date.now(),
            },
          ],
        },
      };
    }
    if (payload.silent !== true) {
      store = appendDirectorMessage(store, {
        role: 'assistant',
        lane: 'background',
        agentJobId: job.id,
        content: result.summary || (isZh ? '周复盘已完成。' : 'Weekly review ready.'),
      });
    }
    return { result: { summaryLength: result.summary?.length ?? 0 }, store };
  }

  if (
    step.step_type === 'todo_content' ||
    step.step_type === 'rewrite_todo_content'
  ) {
    const todoId =
      typeof payload.todoId === 'string' ? payload.todoId : '';
    const todo = store.todos.find((item) => item.id === todoId);
    if (!todo) throw new Error(`Todo not found: ${todoId}`);
    const written = await runChannelWrite({
      todo: {
        channelId: todo.channelId,
        title: todo.title,
        brief: todo.brief,
        dayIndex: todo.dayIndex,
        phase: todo.phase,
        market: todo.market,
        audience: todo.audience,
        purpose: todo.purpose,
        pillar: todo.pillar,
        taskType: todo.taskType,
      },
      channelStrategyMarkdown:
        store.channelStrategies[todo.channelId]?.markdown ?? '',
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      campaignContext: buildAgentContextEnvelope(store, {
        channelId: todo.channelId,
        todoId,
      }),
      locale: job.locale,
    });
    store = {
      ...store,
      todos: store.todos.map((item) =>
        item.id === todoId
          ? {
              ...item,
              content: written,
              contentStatus: 'ready',
              revision: (item.revision ?? 0) + 1,
            }
          : item
      ),
      updatedAt: Date.now(),
    };
    return { result: { todoId }, store };
  }

  if (step.step_type === 'launch_patch') {
    // Interactive merge conflicts are hard offline; record a chat nudge.
    store = appendDirectorMessage(store, {
      role: 'assistant',
      lane: 'background',
      agentJobId: job.id,
      content: isZh
        ? '文档修改需要你在线确认冲突合并。请回到对话里重新发送修改要求。'
        : 'Document edits need you online for conflict merging. Please resend the edit in chat.',
    });
    return { result: { deferred: true }, store };
  }

  if (
    step.step_type === 'schedule_topic_variant' ||
    step.step_type === 'revise_topic_variant' ||
    step.step_type === 'undo_launch_change'
  ) {
    store = appendDirectorMessage(store, {
      role: 'assistant',
      lane: 'background',
      agentJobId: job.id,
      content: isZh
        ? '这项操作需要你在线确认，请回到对话重试。'
        : 'This action needs you online—please retry in chat.',
    });
    return { result: { deferred: true }, store };
  }

  throw new Error(`Unsupported agent work step: ${step.step_type}`);
}

export async function processNextAgentWorkJob(
  workerId: string
): Promise<{
  outcome: 'idle' | 'step_completed' | 'job_completed' | 'step_failed';
  jobId?: string;
  stepKey?: string;
}> {
  const job = await claimAgentWorkJob(workerId, 180);
  if (!job) return { outcome: 'idle' };
  let step: AgentWorkStepRecord | null = null;
  let stepRecorded = false;
  try {
    step = await claimAgentWorkStep(job.id, workerId, 600);
    if (!step) {
      const steps = await listAgentWorkSteps(job.clerk_user_id, job.id);
      let store = (await loadGtmStore(job.clerk_user_id)).store;
      store = patchTaskProgress(store, job, steps);
      await saveGtmStoreWithConflictRetry(job.clerk_user_id, store);
      const completed = await completeAgentWorkJob(job.id, workerId, {
        stepCount: steps.length,
      });
      if (!completed) await releaseAgentWorkJob(job.id, workerId);
      return {
        outcome: completed ? 'job_completed' : 'idle',
        jobId: job.id,
      };
    }

    const { result, store: mutated } = await executeStep(job, step);
    const stepsAfterClaim = await listAgentWorkSteps(job.clerk_user_id, job.id);
    const withProgress = patchTaskProgress(mutated, job, stepsAfterClaim.map((item) =>
      item.id === step!.id
        ? { ...item, status: 'completed' as const, result_snapshot: result }
        : item
    ));
    await saveGtmStoreWithConflictRetry(job.clerk_user_id, withProgress);
    const recorded = await completeAgentWorkStep(step.id, workerId, result);
    if (!recorded) throw new Error('Agent work step lease was lost');
    stepRecorded = true;

    const stepsAfter = await listAgentWorkSteps(job.clerk_user_id, job.id);
    const remaining = stepsAfter.some(
      (item) => !['completed', 'skipped'].includes(item.status)
    );
    if (!remaining) {
      let store = (await loadGtmStore(job.clerk_user_id)).store;
      store = patchTaskProgress(store, job, stepsAfter);
      await saveGtmStoreWithConflictRetry(job.clerk_user_id, store);
      await completeAgentWorkJob(job.id, workerId, {
        completedAt: new Date().toISOString(),
      });
      return {
        outcome: 'job_completed',
        jobId: job.id,
        stepKey: step.step_key,
      };
    }

    await releaseAgentWorkJob(job.id, workerId);
    return {
      outcome: 'step_completed',
      jobId: job.id,
      stepKey: step.step_key,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Agent work worker failed';
    if (step && !stepRecorded) {
      await failAgentWorkStep(
        step.id,
        workerId,
        message,
        Math.min(300, 15 * 2 ** Math.max(0, step.attempt_count - 1))
      );
    } else {
      await releaseAgentWorkJob(job.id, workerId);
    }
    return {
      outcome: 'step_failed',
      jobId: job.id,
      stepKey: step?.step_key,
    };
  }
}

export async function drainAgentWorkJobs(
  workerId: string,
  budgetMs = 240_000
): Promise<{
  outcome: 'idle' | 'step_completed' | 'job_completed' | 'step_failed';
  jobId?: string;
  stepKey?: string;
  stepsProcessed: number;
}> {
  const started = Date.now();
  let stepsProcessed = 0;
  let last: {
    outcome: 'idle' | 'step_completed' | 'job_completed' | 'step_failed';
    jobId?: string;
    stepKey?: string;
  } = { outcome: 'idle' };

  while (Date.now() - started < budgetMs) {
    const result = await processNextAgentWorkJob(
      `${workerId}-aw-${stepsProcessed}`
    );
    last = result;
    if (result.outcome === 'step_completed') {
      stepsProcessed += 1;
      continue;
    }
    if (result.outcome === 'job_completed') {
      stepsProcessed += 1;
      continue;
    }
    break;
  }

  return { ...last, stepsProcessed };
}

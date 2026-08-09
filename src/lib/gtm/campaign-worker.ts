import 'server-only';

import {
  claimCampaignJob,
  claimCampaignJobStep,
  completeCampaignJob,
  completeCampaignJobStep,
  failCampaignJobStep,
  isChannelPlansJob,
  listCampaignJobSteps,
  releaseCampaignJob,
  type CampaignJobRecord,
  type CampaignJobStepRecord,
} from './campaign-jobs';
import { loadGtmStore, saveGtmStoreWithConflictRetry } from './database';
import { channelHasCalendarTodos } from './channel-capabilities';
import {
  buildLaunchBlueprint,
  createCampaignBuildSteps,
  SUPPORTED_LAUNCH_CHANNELS,
} from './launch';
import { addDays } from './dates';
import { buildAgentContextEnvelope } from './agent-context';
import { buildPerformanceContext } from './post-metrics';
import { runStrategist } from '@/lib/agents/strategist';
import { runChannelTodos } from '@/lib/agents/specialist';
import { resolveTodoMarket } from './target-markets';
import type {
  ChannelStrategyDoc,
  ChatMessage,
  GtmStore,
  LaunchBlueprint,
  StrategyResponse,
  Todo,
} from './types';

type BlueprintResult = {
  blueprint: LaunchBlueprint;
  strategy: {
    goal: string;
    overviewMarkdown: string;
    updatedAt: number;
  };
};

type ChannelStrategyResult = {
  channel: StrategyResponse['channels'][number];
};

type ChannelCalendarResult = {
  todos: Todo[];
};

function conversationDigest(store: GtmStore): string {
  return store.directorChat
    .slice(-14)
    .map(
      (message) =>
        `${message.role === 'user' ? '用户' : '市场总监'}：${message.content.slice(0, 200)}`
    )
    .join('\n');
}

function completedResult<T>(
  steps: CampaignJobStepRecord[],
  stepKey: string
): T | null {
  const step = steps.find(
    (candidate) =>
      candidate.step_key === stepKey && candidate.status === 'completed'
  );
  return (step?.result_snapshot as T | null | undefined) ?? null;
}

function materializeStore(
  job: CampaignJobRecord,
  steps: CampaignJobStepRecord[]
): GtmStore {
  const store: GtmStore = structuredClone(job.input_snapshot);
  const launch = store.launch;
  if (!launch) throw new Error('Campaign job is missing Launch state');
  const isZh = job.locale === 'zh';
  const blueprintResult = completedResult<BlueprintResult>(steps, 'blueprint');
  if (blueprintResult) {
    store.strategy = blueprintResult.strategy;
    launch.blueprint = blueprintResult.blueprint;
  }

  const channelStrategies: Record<string, ChannelStrategyDoc> = {
    ...store.channelStrategies,
  };
  for (const channel of SUPPORTED_LAUNCH_CHANNELS) {
    const result = completedResult<ChannelStrategyResult>(
      steps,
      `channel_strategy:${channel.channelId}`
    );
    if (!result?.channel) continue;
    channelStrategies[channel.channelId] = {
      channelId: channel.channelId,
      channelName: result.channel.channelName,
      positioning: result.channel.positioning,
      direction: result.channel.direction,
      contentPillars: result.channel.contentPillars,
      markdown: result.channel.markdown,
      updatedAt: Date.now(),
    };
    const plan = launch.channelPlans[channel.channelId];
    if (plan) {
      launch.channelPlans[channel.channelId] = {
        ...plan,
        mission: result.channel.positioning || plan.mission,
        whyItMatters: result.channel.direction || plan.whyItMatters,
        pillars: result.channel.contentPillars.length
          ? result.channel.contentPillars
          : plan.pillars,
        status: 'ready',
        updatedAt: Date.now(),
      };
    }
  }
  store.channelStrategies = channelStrategies;

  const generatedTodos = SUPPORTED_LAUNCH_CHANNELS.flatMap((channel) => {
    const result = completedResult<ChannelCalendarResult>(
      steps,
      `channel_calendar:${channel.channelId}`
    );
    return result?.todos ?? [];
  });
  if (generatedTodos.length > 0) {
    store.todos = generatedTodos.sort(
      (left, right) =>
        left.dayIndex - right.dayIndex ||
        (left.time ?? '').localeCompare(right.time ?? '')
    );
  }

  const blueprintDone = Boolean(blueprintResult);
  const strategiesDone = SUPPORTED_LAUNCH_CHANNELS.filter((channel) =>
    completedResult(
      steps,
      `channel_strategy:${channel.channelId}`
    )
  ).length;
  const calendarsDone = SUPPORTED_LAUNCH_CHANNELS.filter((channel) =>
    completedResult(
      steps,
      `channel_calendar:${channel.channelId}`
    )
  ).length;
  const finalized = Boolean(completedResult(steps, 'finalize'));
  const total = SUPPORTED_LAUNCH_CHANNELS.length;
  launch.researchProgress = createCampaignBuildSteps(isZh).map((progress) => {
    if (progress.id === 'blueprint') {
      return {
        ...progress,
        status: blueprintDone ? ('done' as const) : ('running' as const),
      };
    }
    if (progress.id === 'channels') {
      return {
        ...progress,
        status:
          strategiesDone === total
            ? ('done' as const)
            : blueprintDone
              ? ('running' as const)
              : ('pending' as const),
        detail: isZh
          ? `已完成 ${strategiesDone}/${total} 个渠道策略`
          : `Finished ${strategiesDone}/${total} channel strategies`,
      };
    }
    if (progress.id === 'calendar') {
      return {
        ...progress,
        status:
          calendarsDone === total
            ? ('done' as const)
            : strategiesDone === total
              ? ('running' as const)
              : ('pending' as const),
        detail: isZh
          ? `已完成 ${calendarsDone}/${total} 个渠道日历`
          : `Finished ${calendarsDone}/${total} channel calendars`,
      };
    }
    return {
      ...progress,
      status: finalized ? ('done' as const) : ('pending' as const),
      detail: finalized
        ? isZh
          ? 'Day 1 任务安排完成'
          : 'Day 1 task schedule is complete'
        : undefined,
    };
  });
  launch.campaignBuildId = job.build_key;
  launch.project = {
    ...launch.project,
    phase: finalized ? 'active' : 'building_team',
    status: finalized ? 'active' : 'building',
    updatedAt: Date.now(),
  };
  store.channels = SUPPORTED_LAUNCH_CHANNELS.map(
    (channel) => channel.channelId
  );
  store.planReady = finalized;
  store.startDate = launch.project.startDate;
  store.paid = true;
  store.updatedAt = Date.now();
  return store;
}

function channelPlanProgressLabel(
  finished: number,
  total: number,
  isZh: boolean
): string {
  return isZh
    ? `渠道专员正在编写计划（${finished}/${total}）…`
    : `Writing channel plans (${finished}/${total})…`;
}

function patchDirectorTaskMessage(
  store: GtmStore,
  taskMessageId: string | undefined,
  label: string,
  status: 'running' | 'done' | 'error',
  agentJobId?: string
): GtmStore {
  if (!taskMessageId) return store;
  let found = false;
  const directorChat = store.directorChat.map((message) => {
    if (message.id !== taskMessageId) return message;
    found = true;
    return {
      ...message,
      ...(agentJobId ? { agentJobId } : {}),
      card: {
        kind: 'agent-task' as const,
        label,
        status,
      },
    };
  });
  if (!found) return store;
  return { ...store, directorChat, updatedAt: Date.now() };
}

function hasChannelPlanCard(store: GtmStore, channelId: string): boolean {
  return store.directorChat.some(
    (message) =>
      message.card?.kind === 'channel_plan' &&
      message.card.channelId === channelId
  );
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
    ...(message.replyToMessageIds
      ? { replyToMessageIds: message.replyToMessageIds }
      : {}),
  };
  return {
    ...store,
    directorChat: [...store.directorChat, next],
    updatedAt: Date.now(),
  };
}

/**
 * Merge completed channel-strategy steps into the latest durable store.
 * Unlike full campaign materialization, this never rewrites todos or phase.
 */
async function materializeChannelPlansStore(
  job: CampaignJobRecord,
  steps: CampaignJobStepRecord[]
): Promise<GtmStore> {
  const { store: latest } = await loadGtmStore(job.clerk_user_id);
  const store: GtmStore = structuredClone(latest);
  const launch = store.launch;
  if (!launch) throw new Error('Channel-plan job is missing Launch state');
  const isZh = job.locale === 'zh';
  const strategySteps = steps.filter(
    (step) =>
      step.step_type === 'channel_strategy' && step.channel_id
  );
  const completedStrategies = strategySteps.filter(
    (step) => step.status === 'completed'
  );
  const total = strategySteps.length;
  const finished = completedStrategies.length;
  const taskMessageId = launch.channelPlanJob?.taskMessageId;

  for (const step of completedStrategies) {
    const result = step.result_snapshot as ChannelStrategyResult | null;
    const channel = result?.channel;
    if (!channel || !step.channel_id) continue;
    store.channelStrategies[step.channel_id] = {
      channelId: channel.channelId,
      channelName: channel.channelName,
      positioning: channel.positioning,
      direction: channel.direction,
      contentPillars: channel.contentPillars,
      markdown: channel.markdown,
      updatedAt: Date.now(),
    };
    const plan = launch.channelPlans[step.channel_id];
    if (plan) {
      launch.channelPlans[step.channel_id] = {
        ...plan,
        mission: channel.positioning || plan.mission,
        whyItMatters: channel.direction || plan.whyItMatters,
        pillars: channel.contentPillars.length
          ? channel.contentPillars
          : plan.pillars,
        status: 'ready',
        updatedAt: Date.now(),
      };
    }
    if (!hasChannelPlanCard(store, step.channel_id)) {
      const withCard = appendDirectorMessage(store, {
        role: 'assistant',
        content: '',
        lane: 'background',
        agentJobId: job.id,
        card: {
          kind: 'channel_plan',
          channelId: channel.channelId,
          channelName: channel.channelName,
        },
      });
      store.directorChat = withCard.directorChat;
      store.updatedAt = withCard.updatedAt;
    }
  }

  const finalizeDone = steps.some(
    (step) => step.step_key === 'finalize' && step.status === 'completed'
  );
  const failed = steps.some((step) => step.status === 'failed');
  let next = patchDirectorTaskMessage(
    store,
    taskMessageId,
    channelPlanProgressLabel(finished, total || finished, isZh),
    finalizeDone ? 'done' : failed ? 'error' : 'running',
    job.id
  );

  if (finalizeDone) {
    const hasCompletion = next.directorChat.some(
      (message) =>
        message.card?.kind === 'options' &&
        !message.card.card.answered?.length &&
        (message.card.card.options.some((option) =>
          option.id.startsWith('generate_todos')
        ) ||
          message.content.includes('Generate todos') ||
          message.content.includes('生成 Todo'))
    );
    if (!hasCompletion) {
      next = appendDirectorMessage(next, {
        role: 'assistant',
        lane: 'background',
        agentJobId: job.id,
        content: isZh
          ? '渠道计划已全部返回。可在左侧「文档」查看详情。Directory 是固定能力，记得稍后去提交。需要我为这些渠道生成 Todo 吗？'
          : 'All channel plans are back—open Documents for details. Directory is always on; I’ll remind you to submit. Generate todos for these channels?',
      });
      next = appendDirectorMessage(next, {
        role: 'assistant',
        lane: 'background',
        agentJobId: job.id,
        // The question is already rendered by the options card. Keeping it in
        // `content` creates a second, identical chat bubble above the card.
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
    }
    if (next.launch) {
      next = {
        ...next,
        launch: {
          ...next.launch,
          channelPlanJob: undefined,
          project: { ...next.launch.project, updatedAt: Date.now() },
        },
      };
    }
  } else if (next.launch?.channelPlanJob) {
    next = {
      ...next,
      launch: {
        ...next.launch,
        channelPlanJob: {
          ...next.launch.channelPlanJob,
          jobId: job.id,
          completedCount: finished,
          totalCount: total || next.launch.channelPlanJob.totalCount,
        },
        project: { ...next.launch.project, updatedAt: Date.now() },
      },
    };
  }

  next.updatedAt = Date.now();
  return next;
}

async function executeStep(
  job: CampaignJobRecord,
  step: CampaignJobStepRecord,
  steps: CampaignJobStepRecord[]
): Promise<unknown> {
  const channelPlansOnly = isChannelPlansJob(job);
  const store = channelPlansOnly
    ? (await loadGtmStore(job.clerk_user_id)).store
    : materializeStore(job, steps);
  const launch = store.launch;
  if (!launch?.brief) throw new Error('Campaign job is missing Launch Brief');
  const channelIds = SUPPORTED_LAUNCH_CHANNELS.map(
    (channel) => channel.channelId
  );

  if (step.step_type === 'blueprint') {
    if (channelPlansOnly) {
      throw new Error('Channel-plan jobs do not run blueprint steps');
    }
    // Compatibility for jobs created by the retired campaign endpoint. Do not
    // spend another model call: derive the old snapshot from the project brief
    // and the market strategy report that already exists.
    const blueprint = buildLaunchBlueprint(
      launch,
      launch.brief,
      null,
      job.locale === 'zh'
    );
    const overviewMarkdown =
      launch.channelRecommendations?.reportMarkdown ||
      launch.channelRecommendations?.summaryMarkdown ||
      store.projectProfileDoc;
    return {
      blueprint,
      strategy: {
        goal: blueprint.campaignGoal,
        overviewMarkdown,
        updatedAt: Date.now(),
      },
    } satisfies BlueprintResult;
  }

  if (step.step_type === 'channel_strategy') {
    if (!step.channel_id) throw new Error('Channel strategy is missing channel id');
    const strategy = await runStrategist({
      channelIds: [step.channel_id],
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      conversationDigest: conversationDigest(store),
      performanceContext: buildPerformanceContext(store.todos),
      existingOverview: store.strategy?.overviewMarkdown,
      campaignContext: buildAgentContextEnvelope(store, {
        channelId: step.channel_id,
      }),
      locale: job.locale,
      phase: 'channel',
    });
    const channel =
      strategy.channels.find(
        (candidate) => candidate.channelId === step.channel_id
      ) ?? strategy.channels[0];
    if (!channel) throw new Error(`Empty strategy for ${step.channel_id}`);
    return { channel } satisfies ChannelStrategyResult;
  }

  if (step.step_type === 'channel_calendar') {
    if (channelPlansOnly) {
      throw new Error('Channel-plan jobs do not run calendar steps');
    }
    if (!step.channel_id) throw new Error('Channel calendar is missing channel id');
    // Directory ships through the submission pipeline, so it owns no calendar days.
    if (!channelHasCalendarTodos(step.channel_id)) {
      return { todos: [] } satisfies ChannelCalendarResult;
    }
    const definition = SUPPORTED_LAUNCH_CHANNELS.find(
      (channel) => channel.channelId === step.channel_id
    );
    if (!definition) throw new Error(`Unsupported channel ${step.channel_id}`);
    const result = await runChannelTodos({
      channelId: step.channel_id,
      channelStrategyMarkdown:
        store.channelStrategies[step.channel_id]?.markdown ?? '',
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      campaignContext: buildAgentContextEnvelope(store, {
        channelId: step.channel_id,
      }),
      targetMarkets: store.targetMarkets ?? [],
      locale: job.locale,
    });
    const todos = result.todos.map(
      (todo, todoIndex): Todo => ({
        id: `${step.channel_id}-${todo.dayIndex}-${todoIndex}-${job.id.slice(0, 8)}`,
        channelId: step.channel_id as string,
        channelName:
          job.locale === 'zh' ? definition.name : definition.nameEn,
        dayIndex: todo.dayIndex,
        date: addDays(launch.project.startDate, todo.dayIndex - 1),
        time: todo.time,
        title: todo.title,
        brief: todo.brief,
        purpose: todo.purpose ?? todo.brief,
        pillar: todo.pillar ?? todo.phase,
        taskType: todo.taskType ?? 'content',
        phase: todo.phase,
        ...resolveTodoMarket(todo, store.targetMarkets),
        status: 'pending',
        launchStatus:
          todo.launchStatus ?? (todo.dayIndex <= 7 ? 'draft' : 'planned'),
        contentStatus: 'none',
        revision: 1,
      })
    );
    if (todos.length === 0) {
      throw new Error(`Empty calendar for ${step.channel_id}`);
    }
    return { todos } satisfies ChannelCalendarResult;
  }

  if (channelPlansOnly) {
    return {
      kind: 'channel_plans_done',
      completedAt: new Date().toISOString(),
    };
  }

  return {
    planReady: true,
    todoCount: store.todos.length,
    completedAt: new Date().toISOString(),
  };
}

export async function processNextCampaignJob(
  workerId: string
): Promise<{
  outcome: 'idle' | 'step_completed' | 'job_completed' | 'step_failed';
  jobId?: string;
  stepKey?: string;
}> {
  const job = await claimCampaignJob(workerId, 180);
  if (!job) return { outcome: 'idle' };
  let step: CampaignJobStepRecord | null = null;
  let stepRecorded = false;
  try {
    step = await claimCampaignJobStep(job.id, workerId, 600);
    if (!step) {
      const steps = await listCampaignJobSteps(job.clerk_user_id, job.id);
      const completed = await completeCampaignJob(job.id, workerId, {
        stepCount: steps.length,
      });
      if (!completed) await releaseCampaignJob(job.id, workerId);
      return {
        outcome: completed ? 'job_completed' : 'idle',
        jobId: job.id,
      };
    }

    const stepsBefore = await listCampaignJobSteps(
      job.clerk_user_id,
      job.id
    );
    const result = await executeStep(job, step, stepsBefore);
    const recorded = await completeCampaignJobStep(
      step.id,
      workerId,
      result
    );
    if (!recorded) throw new Error('Campaign step lease was lost');
    stepRecorded = true;
    const stepsAfter = await listCampaignJobSteps(job.clerk_user_id, job.id);
    const store = isChannelPlansJob(job)
      ? await materializeChannelPlansStore(job, stepsAfter)
      : materializeStore(job, stepsAfter);
    await saveGtmStoreWithConflictRetry(job.clerk_user_id, store);

    if (step.step_type === 'finalize') {
      await completeCampaignJob(job.id, workerId, {
        todoCount: store.todos.length,
        completedAt: new Date().toISOString(),
        ...(isChannelPlansJob(job) ? { kind: 'channel_plans' } : {}),
      });
      return {
        outcome: 'job_completed',
        jobId: job.id,
        stepKey: step.step_key,
      };
    }
    await releaseCampaignJob(job.id, workerId);
    return {
      outcome: 'step_completed',
      jobId: job.id,
      stepKey: step.step_key,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Campaign worker failed';
    if (step && !stepRecorded) {
      await failCampaignJobStep(
        step.id,
        workerId,
        message,
        Math.min(300, 15 * 2 ** Math.max(0, step.attempt_count - 1))
      );
    } else {
      await releaseCampaignJob(job.id, workerId);
    }
    return {
      outcome: 'step_failed',
      jobId: job.id,
      stepKey: step?.step_key,
    };
  }
}

/**
 * Keep claiming steps until idle/complete/failed or the time budget is spent.
 * One browser poll (or cron hit) can therefore advance many steps even if the
 * tab is backgrounded afterward — the work already runs in `after()` on the
 * server.
 */
export async function drainCampaignJobs(
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
    const result = await processNextCampaignJob(
      `${workerId}-${stepsProcessed}`
    );
    last = result;
    if (result.outcome === 'step_completed') {
      stepsProcessed += 1;
      continue;
    }
    if (result.outcome === 'job_completed') {
      stepsProcessed += 1;
    }
    break;
  }

  return { ...last, stepsProcessed };
}

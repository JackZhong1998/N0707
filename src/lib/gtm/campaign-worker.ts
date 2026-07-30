import 'server-only';

import {
  claimCampaignJob,
  claimCampaignJobStep,
  completeCampaignJob,
  completeCampaignJobStep,
  failCampaignJobStep,
  listCampaignJobSteps,
  releaseCampaignJob,
  type CampaignJobRecord,
  type CampaignJobStepRecord,
} from './campaign-jobs';
import { saveGtmStoreWithConflictRetry } from './database';
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
import type {
  ChannelStrategyDoc,
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

async function executeStep(
  job: CampaignJobRecord,
  step: CampaignJobStepRecord,
  steps: CampaignJobStepRecord[]
): Promise<unknown> {
  const store = materializeStore(job, steps);
  const launch = store.launch;
  if (!launch?.brief) throw new Error('Campaign job is missing Launch Brief');
  const channelIds = SUPPORTED_LAUNCH_CHANNELS.map(
    (channel) => channel.channelId
  );

  if (step.step_type === 'blueprint') {
    const spine = await runStrategist({
      channelIds,
      userProfileDoc: store.userProfileDoc,
      projectProfileDoc: store.projectProfileDoc,
      conversationDigest: conversationDigest(store),
      performanceContext: buildPerformanceContext(store.todos),
      campaignContext: buildAgentContextEnvelope(store),
      locale: job.locale,
      phase: 'blueprint',
    });
    const blueprint = buildLaunchBlueprint(
      launch,
      launch.brief,
      spine,
      job.locale === 'zh'
    );
    return {
      blueprint,
      strategy: {
        goal: spine.goal || blueprint.campaignGoal,
        overviewMarkdown: spine.overviewMarkdown,
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
    if (!step.channel_id) throw new Error('Channel calendar is missing channel id');
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
        market: todo.market,
        audience: todo.audience,
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
    const store = materializeStore(job, stepsAfter);
    await saveGtmStoreWithConflictRetry(job.clerk_user_id, store);

    if (step.step_type === 'finalize') {
      await completeCampaignJob(job.id, workerId, {
        todoCount: store.todos.length,
        completedAt: new Date().toISOString(),
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

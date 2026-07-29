import {
  applyStrategyToChannelPlans,
  buildLaunchBlueprint,
  createCampaignBuildSteps,
  createFallbackLaunchTasks,
  SUPPORTED_LAUNCH_CHANNELS,
} from '@/lib/gtm/launch';
import {
  callChannelTodos,
  callStrategist,
} from '@/lib/gtm/api-client';
import { addDays } from '@/lib/gtm/dates';
import type {
  GtmStore,
  LaunchChannelPlan,
  LaunchState,
  StrategyResponse,
  Todo,
} from '@/lib/gtm/types';

type StepUpdate = Record<
  string,
  { status: LaunchState['researchProgress'][number]['status']; detail?: string }
>;

function setSteps(launch: LaunchState, updates: StepUpdate): LaunchState {
  return {
    ...launch,
    researchProgress: launch.researchProgress.map((step) =>
      updates[step.id] ? { ...step, ...updates[step.id] } : step
    ),
    project: { ...launch.project, updatedAt: Date.now() },
  };
}

async function withRetry<T>(
  run: () => Promise<T>,
  attempts: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Channel generation failed');
}

function patchChannelPlan(
  launch: LaunchState,
  channelId: string,
  patch: Partial<LaunchChannelPlan>
): LaunchState {
  const current = launch.channelPlans[channelId];
  if (!current) return launch;
  return {
    ...launch,
    channelPlans: {
      ...launch.channelPlans,
      [channelId]: { ...current, ...patch, updatedAt: Date.now() },
    },
    project: { ...launch.project, updatedAt: Date.now() },
  };
}

export type CampaignBuildCallbacks = {
  onLaunch: (launch: LaunchState) => void;
  onStrategy?: (strategy: StrategyResponse) => void;
  onChannelStrategy?: (channel: StrategyResponse['channels'][number]) => void;
};

/**
 * Paid-only campaign generation from an already-approved Launch Brief.
 *
 * Pipeline:
 * 1) Shared Blueprint spine
 * 2) Per-channel strategies in parallel, each with automatic retry
 * 3) Per-channel calendars in parallel (only after strategy stage finishes)
 */
export async function buildCampaignFromBrief(input: {
  launch: LaunchState;
  store: GtmStore;
  locale: string;
  buildId: string;
  callbacks: CampaignBuildCallbacks;
}): Promise<{ launch: LaunchState; todos: Todo[] }> {
  const isZh = input.locale !== 'en';
  const channels = SUPPORTED_LAUNCH_CHANNELS;
  const channelIds = channels.map((channel) => channel.channelId);
  const total = channelIds.length;
  const brief = input.launch.brief;
  if (!brief) {
    throw new Error(
      isZh
        ? '缺少 Launch Brief，无法生成 Campaign。'
        : 'Launch Brief is required before building the campaign.'
    );
  }

  const state: { launch: LaunchState } = {
    launch: {
      ...input.launch,
      campaignBuildId: input.buildId,
      researchProgress: createCampaignBuildSteps(isZh).map((step) =>
        step.id === 'blueprint' ? { ...step, status: 'running' as const } : step
      ),
      channelPlans: Object.fromEntries(
        Object.entries(input.launch.channelPlans).map(([id, plan]) => [
          id,
          { ...plan, status: 'queued' as const },
        ])
      ),
      project: {
        ...input.launch.project,
        phase: 'building_team',
        status: 'building',
        updatedAt: Date.now(),
      },
    },
  };

  const publish = () => input.callbacks.onLaunch(state.launch);

  publish();

  const strategyStoreBase: GtmStore = {
    ...input.store,
    launch: state.launch,
    channels: channelIds,
  };

  // ---- 1) Shared Blueprint spine ----
  let spine: StrategyResponse | null = null;
  try {
    spine = await withRetry(
      () =>
        callStrategist({
          channelIds,
          store: strategyStoreBase,
          locale: input.locale,
          phase: 'blueprint',
        }),
      2
    );
    input.callbacks.onStrategy?.(spine);
  } catch {
    // Structured fallback below still produces a coherent shared spine.
  }

  const blueprint = buildLaunchBlueprint(state.launch, brief, spine, isZh);
  const overviewMarkdown =
    spine?.overviewMarkdown ||
    [
      `# ${isZh ? '30 天冷启动 Campaign Blueprint' : '30-day Campaign Blueprint'}`,
      '',
      `## Goal`,
      blueprint.campaignGoal,
      '',
      `## Positioning`,
      blueprint.corePositioning,
      '',
      `## Audience`,
      blueprint.targetAudience,
      '',
      `## Pillars`,
      ...blueprint.campaignPillars.map((item) => `- ${item}`),
    ].join('\n');

  const overviewStrategy: StrategyResponse = {
    goal: spine?.goal || blueprint.campaignGoal,
    overviewMarkdown,
    channels: spine?.channels ?? [],
  };
  input.callbacks.onStrategy?.(overviewStrategy);

  state.launch = {
    ...setSteps(state.launch, {
      blueprint: { status: 'done' },
      channels: {
        status: 'running',
        detail: isZh
          ? `渠道策略流水线启动 · 0/${total}`
          : `Channel strategy pipeline started · 0/${total}`,
      },
    }),
    blueprint,
    channelPlans: Object.fromEntries(
      Object.entries(
        applyStrategyToChannelPlans(state.launch, overviewStrategy, isZh)
      ).map(([id, plan]) => [id, { ...plan, status: 'building' as const }])
    ),
    project: { ...state.launch.project, phase: 'building_team', updatedAt: Date.now() },
  };
  publish();

  const storeWithBlueprint: GtmStore = {
    ...strategyStoreBase,
    launch: state.launch,
    strategy: {
      overviewMarkdown,
      goal: overviewStrategy.goal,
      updatedAt: Date.now(),
    },
  };

  // ---- 2) Per-channel strategies (parallel + retry) ----
  let strategyFinished = 0;
  const failedStrategyIds: string[] = [];
  const channelStrategies: StrategyResponse['channels'] = [];

  const strategyResults = await Promise.allSettled(
    channels.map(async (channel) => {
      state.launch = patchChannelPlan(state.launch, channel.channelId, {
        status: 'building',
      });
      publish();

      try {
        const result = await withRetry(
          () =>
            callStrategist({
              channelIds: [channel.channelId],
              store: storeWithBlueprint,
              locale: input.locale,
              phase: 'channel',
              existingOverview: overviewMarkdown,
            }),
          2
        );
        const generated =
          result.channels.find((item) => item.channelId === channel.channelId) ??
          result.channels[0];
        if (!generated) {
          throw new Error(
            isZh
              ? `${channel.name} 策略为空`
              : `${channel.nameEn} strategy was empty`
          );
        }
        channelStrategies.push(generated);
        input.callbacks.onChannelStrategy?.(generated);
        state.launch = patchChannelPlan(state.launch, channel.channelId, {
          mission: generated.positioning || state.launch.channelPlans[channel.channelId]?.mission,
          whyItMatters:
            generated.direction ||
            state.launch.channelPlans[channel.channelId]?.whyItMatters,
          pillars: generated.contentPillars.length
            ? generated.contentPillars
            : state.launch.channelPlans[channel.channelId]?.pillars,
          status: 'ready',
        });
        return generated;
      } catch (error) {
        failedStrategyIds.push(channel.channelId);
        state.launch = patchChannelPlan(state.launch, channel.channelId, {
          status: 'blocked',
        });
        throw error;
      } finally {
        strategyFinished += 1;
        const failedNote =
          failedStrategyIds.length > 0
            ? isZh
              ? ` · ${failedStrategyIds.length} 个失败将用兜底`
              : ` · ${failedStrategyIds.length} failed, using fallback`
            : '';
        state.launch = setSteps(state.launch, {
          channels: {
            status: 'running',
            detail: isZh
              ? `已完成 ${strategyFinished}/${total} 个渠道策略${failedNote}`
              : `Finished ${strategyFinished}/${total} channel strategies${failedNote}`,
          },
        });
        publish();
      }
    })
  );

  const assembled: StrategyResponse = {
    goal: overviewStrategy.goal,
    overviewMarkdown,
    channels: channelStrategies,
  };

  state.launch = {
    ...setSteps(state.launch, {
      channels: {
        status: failedStrategyIds.length ? 'warning' : 'done',
        detail: isZh
          ? `${channelStrategies.length}/${total} 个渠道策略已生成${
              failedStrategyIds.length
                ? `；失败渠道：${failedStrategyIds.join(', ')}（已重试，改用兜底计划）`
                : ''
            }`
          : `${channelStrategies.length}/${total} channel strategies ready${
              failedStrategyIds.length
                ? `; failed after retry: ${failedStrategyIds.join(', ')} (fallback plans)`
                : ''
            }`,
      },
      calendar: { status: 'running', detail: isZh ? `任务日历 · 0/${total}` : `Calendar · 0/${total}` },
    }),
    channelPlans: applyStrategyToChannelPlans(state.launch, assembled, isZh),
  };
  // Preserve blocked status for failed strategy channels.
  for (const channelId of failedStrategyIds) {
    state.launch = patchChannelPlan(state.launch, channelId, { status: 'blocked' });
  }
  for (const channelId of channelIds) {
    if (!failedStrategyIds.includes(channelId)) {
      state.launch = patchChannelPlan(state.launch, channelId, { status: 'ready' });
    }
  }
  publish();

  // ---- 3) Per-channel calendars (parallel + retry) ----
  const fallbackTasks = createFallbackLaunchTasks(
    { ...state.launch, brief, blueprint },
    isZh
  );
  const executionStore: GtmStore = {
    ...storeWithBlueprint,
    launch: state.launch,
    channels: channelIds,
    strategy: {
      overviewMarkdown,
      goal: overviewStrategy.goal,
      updatedAt: Date.now(),
    },
  };

  let calendarFinished = 0;
  const failedCalendarIds: string[] = [];
  const generatedByChannel = new Map<string, Todo[]>();

  await Promise.allSettled(
    channels.map(async (channel) => {
      const channelStrategy = channelStrategies.find(
        (item) => item.channelId === channel.channelId
      );
      try {
        const result = await withRetry(
          () =>
            callChannelTodos({
              channelId: channel.channelId,
              store: executionStore,
              locale: input.locale,
              strategyMarkdownOverride: channelStrategy?.markdown,
            }),
          2
        );
        const todos = result.todos.map(
          (todo, todoIndex): Todo => ({
            id: `${channel.channelId}-${todo.dayIndex}-${todoIndex}-${Date.now()}`,
            channelId: channel.channelId,
            channelName: isZh ? channel.name : channel.nameEn,
            dayIndex: todo.dayIndex,
            date: addDays(state.launch.project.startDate, todo.dayIndex - 1),
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
          throw new Error(
            isZh ? `${channel.name} 任务为空` : `${channel.nameEn} todos were empty`
          );
        }
        generatedByChannel.set(channel.channelId, todos);
      } catch {
        failedCalendarIds.push(channel.channelId);
        generatedByChannel.set(
          channel.channelId,
          fallbackTasks.filter((todo) => todo.channelId === channel.channelId)
        );
      } finally {
        calendarFinished += 1;
        state.launch = setSteps(state.launch, {
          calendar: {
            status: 'running',
            detail: isZh
              ? `已完成 ${calendarFinished}/${total} 个渠道日历${
                  failedCalendarIds.length
                    ? ` · ${failedCalendarIds.length} 个已重试并兜底`
                    : ''
                }`
              : `Finished ${calendarFinished}/${total} channel calendars${
                  failedCalendarIds.length
                    ? ` · ${failedCalendarIds.length} retried with fallback`
                    : ''
                }`,
          },
        });
        publish();
      }
    })
  );

  // Keep TypeScript aware we ran strategyResults (for lint unused).
  void strategyResults;

  const todos = channels
    .flatMap(
      (channel) =>
        generatedByChannel.get(channel.channelId) ??
        fallbackTasks.filter((todo) => todo.channelId === channel.channelId)
    )
    .sort(
      (a, b) =>
        a.dayIndex - b.dayIndex || (a.time ?? '').localeCompare(b.time ?? '')
    );

  state.launch = {
    ...setSteps(state.launch, {
      calendar: {
        status: failedCalendarIds.length ? 'warning' : 'done',
        detail: isZh
          ? `${generatedByChannel.size}/${total} 个渠道已生成任务计划`
          : `${generatedByChannel.size}/${total} channel calendars generated`,
      },
      day1: {
        status: 'done',
        detail: isZh ? 'Day 1 任务安排完成' : 'Day 1 task schedule is complete',
      },
    }),
    project: {
      ...state.launch.project,
      phase: 'active',
      status: 'active',
      updatedAt: Date.now(),
    },
  };
  publish();

  return { launch: state.launch, todos };
}

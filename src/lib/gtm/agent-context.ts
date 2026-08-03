import type { GtmStore, LaunchTaskStatus, TodoStatus } from './types';
import type { ViewContext } from './view-context';

function countBy<T extends string>(values: T[]): Partial<Record<T, number>> {
  return values.reduce<Partial<Record<T, number>>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

/**
 * A bounded, shared campaign envelope for every worker. It deliberately omits
 * long source markdown and full chat history; workers receive the campaign
 * spine and only the execution state needed to keep their output consistent.
 */
export function buildAgentContextEnvelope(
  store: GtmStore,
  options: {
    viewContext?: ViewContext;
    channelId?: string;
    todoId?: string;
  } = {}
): string {
  const launch = store.launch;
  const scopedTodo = options.todoId
    ? store.todos.find((todo) => todo.id === options.todoId)
    : options.viewContext?.entityType === 'todo' && options.viewContext.entityId
      ? store.todos.find((todo) => todo.id === options.viewContext?.entityId)
      : undefined;
  const channelId =
    options.channelId ?? options.viewContext?.channelId ?? scopedTodo?.channelId;
  const channelPlan = channelId ? launch?.channelPlans[channelId] : undefined;
  const taskStatuses = countBy(
    store.todos.map((todo) => (todo.launchStatus ?? todo.status) as LaunchTaskStatus | TodoStatus)
  );
  const publishedLocks = store.todos
    .filter(
      (todo) =>
        Boolean(todo.publishedUrl) ||
        todo.launchStatus === 'published' ||
        todo.launchStatus === 'completed' ||
        todo.status === 'done'
    )
    .slice(-60)
    .map((todo) => ({
      id: todo.id,
      channelId: todo.channelId,
      dayIndex: todo.dayIndex,
      title: todo.title,
      status: todo.launchStatus ?? todo.status,
      publishedUrl: todo.publishedUrl,
      revision: todo.revision ?? 1,
      targetMarketId: todo.targetMarketId,
      outputLocale: todo.outputLocale,
    }));

  const envelope = {
    schema: 'nowbuild.launch-context.v1',
    authority: 'user-confirmed > sourced website fact > current campaign artifact > skill > inference',
    currentView: options.viewContext,
    project: launch?.project,
    targetMarkets: store.targetMarkets ?? [],
    brief: launch?.brief
      ? {
          product: launch.brief.product,
          audience: launch.brief.audience,
          competitors: launch.brief.competitors,
          positioning: launch.brief.positioning,
          evidence: launch.brief.evidence,
          revision: launch.brief.revision,
        }
      : undefined,
    blueprint: launch?.blueprint
      ? {
          campaignGoal: launch.blueprint.campaignGoal,
          corePositioning: launch.blueprint.corePositioning,
          targetAudience: launch.blueprint.targetAudience,
          campaignPillars: launch.blueprint.campaignPillars,
          weeks: launch.blueprint.weeks,
          channelRoles: launch.blueprint.channelRoles,
          guardrails: launch.blueprint.guardrails,
          language: launch.blueprint.language,
          revision: launch.blueprint.revision,
        }
      : undefined,
    scopedChannelPlan: channelPlan,
    channelPlanIndex: launch
      ? Object.values(launch.channelPlans).map((plan) => ({
          channelId: plan.channelId,
          mission: plan.mission,
          status: plan.status,
          revision: plan.revision,
        }))
      : [],
    scopedTask: scopedTodo,
    execution: {
      taskCount: store.todos.length,
      statusCounts: taskStatuses,
      publishedLocks,
      directoryStatusCounts: launch
        ? countBy(launch.directories.map((item) => item.status))
        : {},
      weeklyReviews: launch?.weeklyReviews.map((review) => ({
        week: review.week,
        status: review.status,
        summary: review.summary,
        appliedChanges: review.appliedChanges,
        revision: review.revision,
      })),
    },
    durableFacts: store.memoryFacts.slice(0, 40).map((fact) => ({
      category: fact.category,
      key: fact.key,
      value: fact.value,
      confidence: fact.confidence,
      confirmed: fact.confirmed,
      updatedAt: fact.updatedAt,
    })),
  };

  return JSON.stringify(envelope);
}

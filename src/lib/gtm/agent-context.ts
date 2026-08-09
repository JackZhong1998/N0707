import type { GtmStore, LaunchTaskStatus, TodoStatus } from './types';
import type { ViewContext } from './view-context';
import { relevantMemoryFacts } from './content-preferences';

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
  const durableFacts = relevantMemoryFacts(store.memoryFacts, channelId, 40);
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
    marketStrategyReport: launch?.channelRecommendations
      ? {
          summary: launch.channelRecommendations.summaryMarkdown,
          diagnosis: launch.channelRecommendations.diagnosis,
          recommendations: launch.channelRecommendations.recommendations.map(
            (item) => ({
              channelId: item.channelId,
              priority: item.priority,
              fitScore: item.fitScore,
              rationale: item.rationale,
              marketFit: item.marketFit,
              suggestedCadence: item.suggestedCadence,
            })
          ),
          launchPlan: launch.channelRecommendations.launchPlan,
          updatedAt: launch.channelRecommendations.updatedAt,
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
    durableFacts: durableFacts.map((fact) => ({
      category: fact.category,
      key: fact.key,
      value: fact.value,
      confidence: fact.confidence,
      confirmed: fact.confirmed,
      scope: fact.scope,
      channelId: fact.channelId,
      updatedAt: fact.updatedAt,
    })),
  };

  return JSON.stringify(envelope);
}

/**
 * Small, immutable-fact projection for a local copy edit. The current draft,
 * evidence and feedback travel separately, so execution history and the rest
 * of the channel calendar cannot distract a one-Todo rewrite.
 */
export function buildTodoEditContextEnvelope(store: GtmStore, todoId: string): string {
  const todo = store.todos.find((item) => item.id === todoId);
  const launch = store.launch;
  const market = todo?.targetMarketId
    ? (store.targetMarkets ?? []).find((item) => item.id === todo.targetMarketId)
    : undefined;
  const contentPreferences = relevantMemoryFacts(
    store.memoryFacts,
    todo?.channelId,
    12
  ).filter((fact) => fact.category === 'preference');
  return JSON.stringify({
    schema: 'nowbuild.todo-edit-context.v1',
    authority: 'current user feedback > confirmed fact > sourced fact > existing copy',
    project: launch?.project
      ? {
          id: launch.project.id,
          productName: launch.project.productName,
          productUrl: launch.project.productUrl,
        }
      : undefined,
    product: launch?.brief?.product,
    audience: launch?.brief?.audience,
    positioning: launch?.brief?.positioning,
    marketStrategy: launch?.channelRecommendations
      ? {
          summary: launch.channelRecommendations.summaryMarkdown,
          diagnosis: launch.channelRecommendations.diagnosis,
          selectedChannel: todo?.channelId
            ? launch.channelRecommendations.recommendations.find(
                (item) => item.channelId === todo.channelId
              )
            : undefined,
        }
      : undefined,
    targetMarket: market,
    contentPreferences: contentPreferences.map((fact) => ({
      rule: fact.value,
      scope: fact.scope,
      channelId: fact.channelId,
    })),
    todo: todo
      ? {
          id: todo.id,
          channelId: todo.channelId,
          title: todo.title,
          brief: todo.brief,
          market: todo.market,
          targetMarketId: todo.targetMarketId,
          outputLocale: todo.outputLocale,
          audience: todo.audience,
          purpose: todo.purpose,
          pillar: todo.pillar,
          taskType: todo.taskType,
        }
      : undefined,
  });
}

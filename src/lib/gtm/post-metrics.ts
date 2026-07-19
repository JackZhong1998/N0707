import type { PostMetricSnapshot, PostMetrics, Todo } from './types';

export const METRIC_KEYS: Array<keyof PostMetrics> = [
  'impressions',
  'views',
  'likes',
  'comments',
  'shares',
  'saves',
  'clicks',
  'followersGained',
];

export function latestMetricSnapshot(todo: Todo): PostMetricSnapshot | undefined {
  return [...(todo.metricSnapshots ?? [])].sort(
    (a, b) => b.collectedAt - a.collectedAt
  )[0];
}

export function primaryReach(metrics: PostMetrics): number | undefined {
  return metrics.impressions ?? metrics.views;
}

export function totalEngagement(metrics: PostMetrics): number {
  return (
    (metrics.likes ?? 0) +
    (metrics.comments ?? 0) +
    (metrics.shares ?? 0) +
    (metrics.saves ?? 0)
  );
}

export function engagementRate(metrics: PostMetrics): number | undefined {
  const reach = primaryReach(metrics);
  if (!reach) return undefined;
  return totalEngagement(metrics) / reach;
}

export function formatMetric(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('zh-CN').format(value);
}

export function buildPerformanceContext(todos: Todo[]): string {
  const published = todos
    .filter((todo) => todo.publishedUrl)
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  if (published.length === 0) return '尚无已发布帖子。';

  const channelGroups = new Map<string, Todo[]>();
  for (const todo of published) {
    const list = channelGroups.get(todo.channelId) ?? [];
    list.push(todo);
    channelGroups.set(todo.channelId, list);
  }

  const lines: string[] = [
    `已发布 ${published.length} 条帖子，其中 ${published.filter((t) => latestMetricSnapshot(t)).length} 条已有指标。`,
  ];

  for (const [channelId, posts] of channelGroups) {
    const measured = posts
      .map((todo) => ({ todo, snapshot: latestMetricSnapshot(todo) }))
      .filter(
        (
          item
        ): item is { todo: Todo; snapshot: PostMetricSnapshot } =>
          Boolean(item.snapshot)
      );
    lines.push(`\n## ${posts[0]?.channelName ?? channelId}`);
    if (measured.length === 0) {
      lines.push(`- 已发布 ${posts.length} 条，尚无指标快照。`);
      continue;
    }
    const ranked = measured
      .map(({ todo, snapshot }) => ({
        todo,
        snapshot,
        engagement: totalEngagement(snapshot.metrics),
        rate: engagementRate(snapshot.metrics),
      }))
      .sort(
        (a, b) =>
          (b.rate ?? -1) - (a.rate ?? -1) ||
          b.engagement - a.engagement
      );
    for (const item of ranked.slice(0, 8)) {
      const metrics = item.snapshot.metrics;
      lines.push(
        `- 「${item.todo.content?.title || item.todo.title}」：` +
          `曝光/浏览 ${primaryReach(metrics) ?? '未知'}，点赞 ${metrics.likes ?? '未知'}，` +
          `评论 ${metrics.comments ?? '未知'}，分享 ${metrics.shares ?? '未知'}，` +
          `收藏 ${metrics.saves ?? '未知'}，互动率 ${
            item.rate === undefined ? '未知' : `${(item.rate * 100).toFixed(2)}%`
          }，采集时间 ${new Date(item.snapshot.collectedAt).toISOString()}`
      );
    }
  }

  lines.push(
    '\n判断规则：优先比较同渠道、相近观察窗口的相对表现；不要仅凭单条帖子或绝对点赞数推翻策略。'
  );
  return lines.join('\n').slice(0, 12000);
}

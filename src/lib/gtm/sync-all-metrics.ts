import { latestMetricSnapshot } from '@/lib/gtm/post-metrics';
import {
  collectMetricsWithExtension,
  detectPublisherExtension,
  type SupportedPublishChannel,
} from '@/lib/gtm/publisher-extension';
import type { PostMetricSnapshot, Todo } from '@/lib/gtm/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNCABLE_CHANNELS = ['twitter_x', 'xiaohongshu'] as const;

export interface SyncProgress {
  current: number;
  total: number;
  message: string;
  done?: boolean;
}

export interface SyncAllMetricsOptions {
  force?: boolean;
  onProgress?: (progress: SyncProgress) => void;
}

export interface SyncAllMetricsResult {
  completed: number;
  failed: number;
  skipped: boolean;
  total: number;
}

export function isSyncableTodo(todo: Todo): boolean {
  return Boolean(
    todo.publishedUrl &&
      SYNCABLE_CHANNELS.includes(
        todo.channelId as (typeof SYNCABLE_CHANNELS)[number]
      )
  );
}

export function isDueForSync(
  todo: Todo,
  now: number,
  force = false
): boolean {
  if (!isSyncableTodo(todo)) return false;
  if (force) return true;
  const latest = latestMetricSnapshot(todo);
  const lastKnownAt = latest?.collectedAt ?? todo.publishedAt;
  return !lastKnownAt || now - lastKnownAt >= DAY_MS;
}

export async function syncAllPostMetrics(
  todos: Todo[],
  updateTodo: (todoId: string, patch: Partial<Todo>) => void,
  options: SyncAllMetricsOptions = {}
): Promise<SyncAllMetricsResult> {
  const { force = false, onProgress } = options;
  const now = Date.now();

  const publisher = await detectPublisherExtension();
  if (!publisher.installed) {
    return { completed: 0, failed: 0, skipped: true, total: 0 };
  }

  const due = todos.filter((todo) => isDueForSync(todo, now, force));
  if (due.length === 0) {
    onProgress?.({ current: 0, total: 0, message: '', done: true });
    return { completed: 0, failed: 0, skipped: false, total: 0 };
  }

  let completed = 0;
  let failed = 0;

  for (let i = 0; i < due.length; i++) {
    const todo = due[i]!;
    if (!todo.publishedUrl) continue;

    onProgress?.({
      current: i + 1,
      total: due.length,
      message: todo.content?.title || todo.title,
    });

    updateTodo(todo.id, { trackingStatus: 'collecting' });
    try {
      const task = collectMetricsWithExtension(
        todo.channelId as SupportedPublishChannel,
        todo.publishedUrl,
        () => undefined
      );
      const result = await task.completion;
      if (!result.metrics) throw new Error('No metrics');
      const snapshot: PostMetricSnapshot = {
        id: crypto.randomUUID(),
        collectedAt: Date.now(),
        source: 'extension',
        metrics: result.metrics,
      };
      updateTodo(todo.id, {
        trackingStatus: 'active',
        metricSnapshots: [...(todo.metricSnapshots ?? []), snapshot],
      });
      completed += 1;
    } catch {
      updateTodo(todo.id, { trackingStatus: 'needs_user' });
      failed += 1;
    }
  }

  return { completed, failed, skipped: false, total: due.length };
}

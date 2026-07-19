'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';
import { latestMetricSnapshot } from '@/lib/gtm/post-metrics';
import {
  collectMetricsWithExtension,
  detectPublisherExtension,
  type SupportedPublishChannel,
} from '@/lib/gtm/publisher-extension';
import type { PostMetricSnapshot, Todo } from '@/lib/gtm/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function isDue(todo: Todo, now: number): boolean {
  if (
    !todo.publishedUrl ||
    !['twitter_x', 'xiaohongshu'].includes(todo.channelId)
  ) {
    return false;
  }
  const latest = latestMetricSnapshot(todo);
  const lastKnownAt = latest?.collectedAt ?? todo.publishedAt;
  return !lastKnownAt || now - lastKnownAt >= DAY_MS;
}

export default function AutoMetricsSync() {
  const { store, hydrated, updateTodo } = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const runningRef = useRef(false);
  const attemptedRef = useRef(new Set<string>());
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
    done?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!hydrated || !store.paid || runningRef.current) return;
    const now = Date.now();
    const due = store.todos.filter(
      (todo) => isDue(todo, now) && !attemptedRef.current.has(todo.id)
    );
    if (due.length === 0) return;

    runningRef.current = true;
    for (const todo of due) attemptedRef.current.add(todo.id);

    void (async () => {
      const publisher = await detectPublisherExtension();
      if (!publisher.installed) {
        runningRef.current = false;
        return;
      }

      let completed = 0;
      let failed = 0;
      setProgress({
        current: 0,
        total: due.length,
        message: isZh ? '正在检查到期帖子…' : 'Checking due posts…',
      });

      for (const todo of due) {
        if (!todo.publishedUrl) continue;
        setProgress({
          current: completed + failed + 1,
          total: due.length,
          message: isZh
            ? `正在更新：${todo.content?.title || todo.title}`
            : `Updating: ${todo.content?.title || todo.title}`,
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

      setProgress({
        current: due.length,
        total: due.length,
        done: true,
        message:
          failed === 0
            ? isZh
              ? `已自动更新 ${completed} 条帖子`
              : `Updated ${completed} posts`
            : isZh
              ? `更新完成：${completed} 条成功，${failed} 条需要手动处理`
              : `Finished: ${completed} updated, ${failed} need attention`,
      });
      runningRef.current = false;
      window.setTimeout(() => setProgress(null), 5000);
    })();
  }, [hydrated, isZh, store.paid, store.todos, updateTodo]);

  if (!progress) return null;

  return (
    <div className="fixed right-4 top-16 z-40 w-[min(340px,calc(100vw-2rem))] rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-3">
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${
            progress.done ? 'bg-emerald-400' : 'animate-pulse bg-white'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{progress.message}</p>
          <p className="mt-0.5 text-[10px] text-zinc-400">
            {progress.current} / {progress.total}
          </p>
        </div>
      </div>
    </div>
  );
}

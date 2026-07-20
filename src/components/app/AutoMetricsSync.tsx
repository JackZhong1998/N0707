'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';
import {
  isDueForSync,
  syncAllPostMetrics,
  type SyncProgress,
} from '@/lib/gtm/sync-all-metrics';

export default function AutoMetricsSync() {
  const { store, hydrated, updateTodo } = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const runningRef = useRef(false);
  const attemptedRef = useRef(new Set<string>());
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  useEffect(() => {
    if (!hydrated || !store.paid || runningRef.current) return;
    const now = Date.now();
    const due = store.todos.filter(
      (todo) =>
        isDueForSync(todo, now) && !attemptedRef.current.has(todo.id)
    );
    if (due.length === 0) return;

    runningRef.current = true;
    for (const todo of due) attemptedRef.current.add(todo.id);

    void (async () => {
      setProgress({
        current: 0,
        total: due.length,
        message: isZh ? '正在检查到期帖子…' : 'Checking due posts…',
      });

      const result = await syncAllPostMetrics(store.todos, updateTodo, {
        onProgress: (next) => setProgress(next),
      });

      if (result.skipped) {
        runningRef.current = false;
        setProgress(null);
        return;
      }

      setProgress({
        current: result.total,
        total: result.total,
        done: true,
        message:
          result.failed === 0
            ? isZh
              ? `已自动更新 ${result.completed} 条帖子`
              : `Updated ${result.completed} posts`
            : isZh
              ? `更新完成：${result.completed} 条成功，${result.failed} 条需要手动处理`
              : `Finished: ${result.completed} updated, ${result.failed} need attention`,
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
          {progress.total > 0 && (
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {progress.current} / {progress.total}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

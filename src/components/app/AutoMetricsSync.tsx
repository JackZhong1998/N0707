'use client';

import { useEffect, useRef } from 'react';
import { useGtm } from '@/lib/gtm/store';
import { isDueForSync, syncAllPostMetrics } from '@/lib/gtm/sync-all-metrics';

/**
 * Refreshes metrics for due posts in the background. Intentionally renders
 * nothing: post work is driven by the offline cron worker, so progress and
 * failures do not need a user-facing toast.
 */
export default function AutoMetricsSync() {
  const { store, hydrated, updateTodo } = useGtm();
  const runningRef = useRef(false);
  const attemptedRef = useRef(new Set<string>());

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
      try {
        await syncAllPostMetrics(store.todos, updateTodo);
      } finally {
        runningRef.current = false;
      }
    })();
  }, [hydrated, store.paid, store.todos, updateTodo]);

  return null;
}

import { addDays, parseDateStr, todayStr } from './dates';
import type { GtmStore } from './types';

/** Pick the least crowded remaining campaign day, preferring the earliest tie. */
export function chooseTopicScheduleDay(store: GtmStore): {
  dayIndex: number;
  date: string;
} {
  return chooseTopicScheduleDays(store, 1)[0]!;
}

/**
 * Spread `count` schedule slots across remaining campaign days (1–30).
 * Prefers least crowded days; when ties, earlier days win. Reuses days only
 * after every remaining day has been assigned once.
 */
export function chooseTopicScheduleDays(
  store: GtmStore,
  count: number
): Array<{ dayIndex: number; date: string }> {
  const safeCount = Math.max(0, Math.min(60, Math.round(count)));
  if (safeCount === 0) return [];

  const startDate = store.startDate ?? store.launch?.project.startDate ?? todayStr();
  const elapsed = Math.floor(
    (parseDateStr(todayStr()).getTime() - parseDateStr(startDate).getTime()) /
      86_400_000
  );
  const firstDay = Math.max(1, Math.min(30, elapsed + 1));
  const counts = new Map<number, number>();
  for (let dayIndex = firstDay; dayIndex <= 30; dayIndex += 1) {
    counts.set(dayIndex, 0);
  }
  for (const todo of store.todos) {
    if (todo.dayIndex < firstDay || todo.dayIndex > 30) continue;
    counts.set(todo.dayIndex, (counts.get(todo.dayIndex) ?? 0) + 1);
  }

  const picks: Array<{ dayIndex: number; date: string }> = [];
  for (let i = 0; i < safeCount; i += 1) {
    let bestDay = firstDay;
    let bestCount = Number.POSITIVE_INFINITY;
    for (let dayIndex = firstDay; dayIndex <= 30; dayIndex += 1) {
      const occupied = counts.get(dayIndex) ?? 0;
      if (occupied < bestCount) {
        bestDay = dayIndex;
        bestCount = occupied;
      }
    }
    counts.set(bestDay, (counts.get(bestDay) ?? 0) + 1);
    picks.push({ dayIndex: bestDay, date: addDays(startDate, bestDay - 1) });
  }
  return picks;
}

export function chooseTopicScheduleTime(
  store: GtmStore,
  channelId: string,
  date: string
): string {
  const channelTodos = store.todos.filter((todo) => todo.channelId === channelId);
  const preferred =
    channelTodos.find((todo) => todo.date >= date && todo.time)?.time ??
    channelTodos.find((todo) => todo.time)?.time ??
    '10:00';
  const occupied = new Set(
    channelTodos
      .filter((todo) => todo.date === date && todo.time)
      .map((todo) => todo.time as string)
  );
  if (!occupied.has(preferred)) return preferred;

  const [hour, minute] = preferred.split(':').map(Number);
  for (let offset = 30; offset <= 180; offset += 30) {
    const total = (hour * 60 + minute + offset) % (24 * 60);
    const candidate = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    if (!occupied.has(candidate)) return candidate;
  }
  return preferred;
}

import { addDays, parseDateStr, todayStr } from './dates';
import type { GtmStore } from './types';

/** Pick the least crowded remaining campaign day, preferring the earliest tie. */
export function chooseTopicScheduleDay(store: GtmStore): {
  dayIndex: number;
  date: string;
} {
  const startDate = store.startDate ?? store.launch?.project.startDate ?? todayStr();
  const elapsed = Math.floor(
    (parseDateStr(todayStr()).getTime() - parseDateStr(startDate).getTime()) /
      86_400_000
  );
  const firstDay = Math.max(1, Math.min(30, elapsed + 1));
  const counts = new Map<string, number>();
  for (const todo of store.todos) {
    counts.set(todo.date, (counts.get(todo.date) ?? 0) + 1);
  }

  let bestDay = firstDay;
  let bestCount = Number.POSITIVE_INFINITY;
  for (let dayIndex = firstDay; dayIndex <= 30; dayIndex += 1) {
    const date = addDays(startDate, dayIndex - 1);
    const count = counts.get(date) ?? 0;
    if (count < bestCount) {
      bestDay = dayIndex;
      bestCount = count;
    }
  }
  return { dayIndex: bestDay, date: addDays(startDate, bestDay - 1) };
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

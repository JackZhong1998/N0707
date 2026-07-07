import type { DailyTask, UnifiedDayPlan } from './types';

export function computeCurrentDayIndex(campaignStartDate: string): number {
  const start = new Date(campaignStartDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diff + 1, 1), 30);
}

export function getTodayTasks(calendar: UnifiedDayPlan[], dayIndex: number): DailyTask[] {
  const day = calendar.find((d) => d.dayIndex === dayIndex);
  return day?.tasks ?? [];
}

export function getWeekCompletionRate(calendar: UnifiedDayPlan[], dayIndex: number): number {
  const weekStart = Math.max(1, dayIndex - ((dayIndex - 1) % 7));
  const weekEnd = Math.min(weekStart + 6, dayIndex);
  const weekTasks = calendar
    .filter((d) => d.dayIndex >= weekStart && d.dayIndex <= weekEnd)
    .flatMap((d) => d.tasks);
  const done = weekTasks.filter((t) => t.status === 'done').length;
  const total = weekTasks.filter((t) => t.status !== 'skipped').length;
  return total > 0 ? done / total : 0;
}

/** 重排后续日历：保留已过去/已完成的天，替换未来的 pending 天 */
export function mergeReplannedCalendar(
  existing: UnifiedDayPlan[],
  replanned: UnifiedDayPlan[],
  fromDayIndex: number
): UnifiedDayPlan[] {
  const kept = existing.filter(
    (d) =>
      d.dayIndex < fromDayIndex ||
      d.tasks.some((t) => t.status === 'done' || t.status === 'skipped')
  );
  const keptDays = new Set(kept.map((d) => d.dayIndex));
  const incoming = replanned.filter(
    (d) => d.dayIndex >= fromDayIndex && !keptDays.has(d.dayIndex)
  );
  return [...kept, ...incoming].sort((a, b) => a.dayIndex - b.dayIndex);
}

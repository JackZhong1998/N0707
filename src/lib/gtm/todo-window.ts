export interface TodoWindow {
  startDay: number;
  endDay: number;
}

const CAMPAIGN_LAST_DAY = 30;
const WINDOW_DAYS = 7;

export function normalizeTodoWindow(
  startDay?: number,
  endDay?: number
): TodoWindow {
  const normalizedStart = Number.isFinite(startDay)
    ? Math.max(1, Math.min(CAMPAIGN_LAST_DAY, Math.trunc(startDay!)))
    : 1;
  const latestEnd = Math.min(
    CAMPAIGN_LAST_DAY,
    normalizedStart + WINDOW_DAYS - 1
  );
  const normalizedEnd = Number.isFinite(endDay)
    ? Math.max(normalizedStart, Math.min(latestEnd, Math.trunc(endDay!)))
    : latestEnd;
  return { startDay: normalizedStart, endDay: normalizedEnd };
}

export function todoWindowAfterWeek(week: number): TodoWindow | null {
  const startDay = Math.trunc(week) * WINDOW_DAYS + 1;
  if (startDay > CAMPAIGN_LAST_DAY) return null;
  return normalizeTodoWindow(startDay);
}

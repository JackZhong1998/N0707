/** 日期工具（本地时区，YYYY-MM-DD 字符串为主） */

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/** 以周一为一周起点 */
export function startOfWeek(s: string): string {
  const d = parseDateStr(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toDateStr(d);
}

export function startOfMonth(s: string): string {
  const d = parseDateStr(s);
  d.setDate(1);
  return toDateStr(d);
}

export function daysInMonth(s: string): number {
  const d = parseDateStr(s);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function formatShort(s: string, locale: string): string {
  const d = parseDateStr(s);
  return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatWeekday(s: string, locale: string): string {
  const d = parseDateStr(s);
  return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'short',
  });
}

export const WEEKDAY_LABELS_ZH = ['一', '二', '三', '四', '五', '六', '日'];
export const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

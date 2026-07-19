import { getLocale } from 'next-intl/server';
import { buildDemoTodos } from '@/lib/gtm/demo-calendar';
import {
  addDays,
  parseDateStr,
  startOfWeek,
  todayStr,
  WEEKDAY_LABELS_EN,
  WEEKDAY_LABELS_ZH,
} from '@/lib/gtm/dates';

/**
 * 产品一瞥：行动日历第一周（与产品内页周视图同款样式）
 * - 仅文字渠道名，不显示渠道 Logo
 * - 当天列拉宽展示更多内容；非焦点日隐藏副标题
 * - 中文：中外渠道混排；英文：海外渠道
 */
export default async function CalendarGlimpse() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const todos = buildDemoTodos(locale);
  const today = todayStr();
  const weekStart = startOfWeek(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const focusDate = weekDates.includes(today) ? today : weekDates[0];
  const weekdays = isZh ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS_EN;

  const byDate = new Map<string, typeof todos>();
  for (const t of todos) {
    const list = byDate.get(t.date) ?? [];
    list.push(t);
    byDate.set(t.date, list);
  }

  return (
    <section className="bg-paper-dim">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="index-label">{isZh ? '行动日历' : 'The action calendar'}</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {isZh ? '规划好每一天，也写好每一篇' : 'Every day planned. Every post drafted.'}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
            {isZh
              ? '行动日历替你做两件事：规划好每天要做的市场动作，也备好当天要发的内容初稿。你只需要用自己的品味做判断 — 每天 15–30 分钟，轻松完成当天的任务。'
              : 'The calendar plans your daily marketing moves and drafts the content to go with them. You apply your taste — fifteen to thirty minutes a day gets it done.'}
          </p>
        </div>

        <div className="mt-12 overflow-x-auto rounded-3xl bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.05)]">
          <div
            className="grid min-w-[1080px] gap-2"
            style={{
              gridTemplateColumns: weekDates
                .map((d) => (d === focusDate ? '2.1fr' : '1fr'))
                .join(' '),
            }}
          >
            {weekDates.map((date, i) => {
              const dayTodos = byDate.get(date) ?? [];
              const isToday = date === today;
              const isFocus = date === focusDate;
              return (
                <div
                  key={date}
                  className={`flex min-h-[520px] flex-col overflow-hidden rounded-2xl transition-[flex-basis] ${
                    isFocus
                      ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
                      : 'bg-white/80'
                  }`}
                >
                  <div
                    className={`flex items-baseline gap-1.5 px-3 py-2 ${
                      isToday ? 'rounded-t-2xl bg-ink' : 'rounded-t-2xl bg-paper-dim'
                    }`}
                  >
                    <span className={`index-label ${isToday ? '!text-zinc-300' : ''}`}>
                      {weekdays[i]}
                    </span>
                    <span className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-ink'}`}>
                      {parseDateStr(date).getDate()}
                    </span>
                    {isToday && (
                      <span className="ml-auto text-[10px] font-medium text-zinc-300">
                        {isZh ? '今天' : 'Today'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {dayTodos.map((t) => (
                      <div
                        key={t.id}
                        className={`rounded-xl bg-paper-dim/60 p-2.5 ${
                          t.status === 'done' ? 'opacity-55' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate text-[10px] font-medium tracking-wide text-zinc-500">
                            {t.channelName}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span className="font-mono text-[10px] text-zinc-400">{t.time}</span>
                            {t.status === 'done' ? (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink">
                                <svg className="h-2 w-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              </span>
                            ) : (
                              <span className="block h-3.5 w-3.5 rounded-full border-2 border-zinc-300 bg-white" />
                            )}
                          </span>
                        </div>
                        <p
                          className={`mt-1.5 text-[12px] font-semibold leading-snug text-ink ${
                            t.status === 'done' ? 'line-through' : ''
                          }`}
                        >
                          {t.title}
                        </p>
                        {isFocus && t.brief && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                            {t.brief}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          {isZh
            ? '第 1 周示例 · 完整计划覆盖 30 天 · 面向海外市场写英文、面向中国市场写中文'
            : 'Week 1 of 30 · overseas channels for EN users · CN + global mix for zh users'}
        </p>
      </div>
    </section>
  );
}

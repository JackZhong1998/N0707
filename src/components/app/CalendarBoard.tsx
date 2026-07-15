'use client';

/**
 * 图图日历 — 支持日 / 周 / 月视图切换的 To-Do 日历
 */

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { Todo } from '@/lib/gtm/types';
import {
  addDays,
  daysInMonth,
  formatShort,
  parseDateStr,
  startOfMonth,
  startOfWeek,
  todayStr,
  WEEKDAY_LABELS_EN,
  WEEKDAY_LABELS_ZH,
} from '@/lib/gtm/dates';

type ViewMode = 'day' | 'week' | 'month';

const CHANNEL_TONES: Record<string, string> = {
  xiaohongshu: 'bg-zinc-900 text-white',
  user_outreach: 'bg-zinc-600 text-white',
  twitter_x: 'bg-zinc-400 text-white',
  wechat_official: 'bg-zinc-700 text-white',
  reddit: 'bg-zinc-500 text-white',
  linkedin: 'bg-zinc-800 text-white',
};

function channelTone(channelId: string): string {
  return CHANNEL_TONES[channelId] ?? 'bg-zinc-300 text-ink';
}

function StatusDot({ status }: { status: Todo['status'] }) {
  if (status === 'done') {
    return (
      <svg className="h-3.5 w-3.5 shrink-0 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return <span className="h-2 w-2 shrink-0 rounded-full border border-zinc-300" />;
}

function TodoCard({
  todo,
  interactive,
  onOpen,
}: {
  todo: Todo;
  interactive: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => interactive && onOpen(todo.id)}
      className={`block w-full border border-hairline bg-white p-2.5 text-left transition-colors ${
        interactive ? 'cursor-pointer hover:border-zinc-400' : 'cursor-default'
      } ${todo.status === 'done' ? 'opacity-55' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`inline-block px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${channelTone(todo.channelId)}`}
        >
          {todo.channelName}
        </span>
        {todo.time && <span className="font-mono text-[10px] text-zinc-400">{todo.time}</span>}
      </div>
      <p
        className={`mt-1.5 text-[12px] font-medium leading-snug text-ink ${
          todo.status === 'done' ? 'line-through' : ''
        }`}
      >
        {todo.title}
      </p>
    </button>
  );
}

export default function CalendarBoard({
  todos,
  interactive,
  onToggleStatus,
}: {
  todos: Todo[];
  interactive: boolean;
  onToggleStatus?: (id: string) => void;
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState<string>(todayStr());

  const byDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
    }
    return map;
  }, [todos]);

  const openTask = (id: string) => router.push(`/app/calendar/task/${id}`);

  const weekdays = isZh ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS_EN;
  const today = todayStr();

  const shift = (dir: 1 | -1) => {
    if (view === 'day') setAnchor(addDays(anchor, dir));
    else if (view === 'week') setAnchor(addDays(anchor, dir * 7));
    else {
      const d = parseDateStr(startOfMonth(anchor));
      d.setMonth(d.getMonth() + dir);
      setAnchor(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      );
    }
  };

  const periodLabel = useMemo(() => {
    const d = parseDateStr(anchor);
    if (view === 'month') {
      return d.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
    if (view === 'week') {
      const ws = startOfWeek(anchor);
      return `${formatShort(ws, locale)} – ${formatShort(addDays(ws, 6), locale)}`;
    }
    return d.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, [anchor, view, isZh, locale]);

  return (
    <div className="flex h-full flex-col">
      {/* 头部：标题 + 视图切换 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-ink">
            {isZh ? '图图日历' : 'Tutu Calendar'}
          </h1>
          <span className="hidden text-sm text-zinc-400 sm:inline">{periodLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-hairline">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {v === 'day' ? (isZh ? '日' : 'Day') : v === 'week' ? (isZh ? '周' : 'Week') : isZh ? '月' : 'Month'}
              </button>
            ))}
          </div>
          <div className="flex border border-hairline">
            <button onClick={() => shift(-1)} className="px-2.5 py-1.5 text-ink-muted hover:text-ink" aria-label="prev">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button
              onClick={() => setAnchor(todayStr())}
              className="border-x border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
            >
              {isZh ? '今天' : 'Today'}
            </button>
            <button onClick={() => shift(1)} className="px-2.5 py-1.5 text-ink-muted hover:text-ink" aria-label="next">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      </div>

      <p className="px-4 pt-2 text-xs text-zinc-400 sm:hidden">{periodLabel}</p>

      {/* 视图主体 */}
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        {view === 'week' && (
          <div className="grid min-w-[760px] grid-cols-7 gap-px border border-hairline bg-hairline">
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(startOfWeek(anchor), i);
              const dayTodos = byDate.get(date) ?? [];
              const isToday = date === today;
              return (
                <div key={date} className="flex min-h-[420px] flex-col bg-white">
                  <div className={`flex items-baseline gap-1.5 border-b border-hairline px-2.5 py-2 ${isToday ? 'bg-ink' : 'bg-paper-dim'}`}>
                    <span className={`index-label ${isToday ? '!text-zinc-300' : ''}`}>{weekdays[i]}</span>
                    <span className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-ink'}`}>
                      {parseDateStr(date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1.5 p-1.5">
                    {dayTodos.map((t) => (
                      <TodoCard key={t.id} todo={t} interactive={interactive} onOpen={openTask} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'day' && (
          <div className="mx-auto max-w-2xl">
            {(byDate.get(anchor) ?? []).length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-400">
                {isZh ? '这一天没有安排任务 — 休息也是策略的一部分。' : 'Nothing scheduled — rest is part of the strategy.'}
              </p>
            ) : (
              <div className="space-y-2">
                {(byDate.get(anchor) ?? []).map((t) => (
                  <div key={t.id} className="flex items-stretch gap-0 border border-hairline">
                    <div className="flex w-16 shrink-0 items-center justify-center border-r border-hairline bg-paper-dim font-mono text-xs text-zinc-500">
                      {t.time ?? '—'}
                    </div>
                    <button
                      onClick={() => interactive && openTask(t.id)}
                      className={`flex min-w-0 flex-1 items-center gap-3 p-3.5 text-left ${interactive ? 'hover:bg-paper-dim' : 'cursor-default'}`}
                    >
                      {onToggleStatus && interactive ? (
                        <span
                          role="checkbox"
                          aria-checked={t.status === 'done'}
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(t.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleStatus(t.id);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <StatusDot status={t.status} />
                        </span>
                      ) : (
                        <StatusDot status={t.status} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium text-ink ${t.status === 'done' ? 'line-through opacity-55' : ''}`}>
                          {t.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-400">{t.brief}</p>
                      </div>
                      <span className={`shrink-0 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${channelTone(t.channelId)}`}>
                        {t.channelName}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'month' && (
          <MonthGrid
            anchor={anchor}
            byDate={byDate}
            onOpenDay={(date) => {
              setAnchor(date);
              setView('day');
            }}
            weekdays={weekdays}
            today={today}
          />
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  byDate,
  onOpenDay,
  weekdays,
  today,
}: {
  anchor: string;
  byDate: Map<string, Todo[]>;
  onOpenDay: (date: string) => void;
  weekdays: string[];
  today: string;
}) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const total = daysInMonth(anchor);
  const monthIdx = parseDateStr(first).getMonth();
  // 覆盖整月所需的周数
  const weeks = Math.ceil(
    (parseDateStr(first).getDay() === 0 ? 6 : parseDateStr(first).getDay() - 1 + total) / 7
  );

  return (
    <div className="grid grid-cols-7 gap-px border border-hairline bg-hairline">
      {weekdays.map((d) => (
        <div key={d} className="bg-paper-dim px-2 py-2">
          <span className="index-label">{d}</span>
        </div>
      ))}
      {Array.from({ length: weeks * 7 }, (_, i) => {
        const date = addDays(gridStart, i);
        const inMonth = parseDateStr(date).getMonth() === monthIdx;
        const dayTodos = byDate.get(date) ?? [];
        const isToday = date === today;
        return (
          <button
            key={date}
            onClick={() => onOpenDay(date)}
            className={`min-h-20 p-1.5 text-left align-top transition-colors sm:min-h-24 ${
              inMonth ? 'bg-white hover:bg-paper-dim' : 'bg-paper-dim/60'
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center text-xs font-medium ${
                isToday ? 'bg-ink text-white' : inMonth ? 'text-ink' : 'text-zinc-300'
              }`}
            >
              {parseDateStr(date).getDate()}
            </span>
            <div className="mt-1 space-y-0.5">
              {dayTodos.slice(0, 2).map((t) => (
                <p
                  key={t.id}
                  className={`truncate text-[10px] leading-tight ${
                    t.status === 'done' ? 'text-zinc-300 line-through' : 'text-ink-soft'
                  }`}
                >
                  {t.title}
                </p>
              ))}
              {dayTodos.length > 2 && (
                <p className="text-[10px] text-zinc-400">+{dayTodos.length - 2}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

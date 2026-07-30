'use client';

/**
 * 行动日历 — 支持日 / 周 / 月视图切换的 To-Do 日历
 * - 渠道用品牌 Logo 标识
 * - 每条 To-Do 带可点击的完成圆球
 * - 日 / 周 / 月视图：纵向列表，左侧日期、右侧 To-Do；周 / 月视图焦点日（默认当天）展示完整内容
 */

import { forwardRef, memo, useEffect, useMemo, useRef, useState, type Ref } from 'react';
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

/** 可点击的完成圆球 */
function DoneBall({
  done,
  onToggle,
  size = 'md',
}: {
  done: boolean;
  onToggle?: () => void;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const ball = done ? (
    <span className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-ink`}>
      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </span>
  ) : (
    <span
      className={`block ${dim} shrink-0 rounded-full border-2 border-zinc-300 bg-white transition-colors ${
        onToggle ? 'hover:border-ink' : ''
      }`}
    />
  );

  if (!onToggle) return ball;
  return (
    <span
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
      className="cursor-pointer"
      title={done ? '取消完成' : '标记完成'}
    >
      {ball}
    </span>
  );
}

const TodoCard = memo(function TodoCard({
  todo,
  interactive,
  compact = false,
  onOpen,
  onPrefetch,
  onToggleStatus,
}: {
  todo: Todo;
  interactive: boolean;
  /** 紧凑模式（周视图非焦点日）：隐藏副标题与市场标签 */
  compact?: boolean;
  onOpen: (id: string) => void;
  onPrefetch?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}) {
  return (
    <div
      onClick={() => interactive && onOpen(todo.id)}
      onMouseEnter={() => interactive && onPrefetch?.(todo.id)}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && e.key === 'Enter') onOpen(todo.id);
      }}
      className={`block w-full rounded-xl bg-paper-dim/50 p-3 text-left transition-colors ${
        interactive ? 'cursor-pointer hover:bg-paper-dim hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)]' : 'cursor-default'
      } ${todo.status === 'done' ? 'opacity-55' : ''}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[10px] font-medium tracking-wide text-zinc-500">{todo.channelName}</span>
          {todo.launchStatus && (
            <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[8px] uppercase text-zinc-500">
              {todo.launchStatus.replace('_', ' ')}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {todo.time && <span className="font-mono text-[10px] text-zinc-400">{todo.time}</span>}
          <DoneBall
            done={todo.status === 'done'}
            onToggle={
              interactive && onToggleStatus ? () => onToggleStatus(todo.id) : undefined
            }
          />
        </span>
      </div>
      <p
        className={`mt-2 text-[13px] font-semibold leading-snug text-ink ${
          todo.status === 'done' ? 'line-through' : ''
        }`}
      >
        {todo.title}
      </p>
      {!compact && (todo.purpose || todo.brief) && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">{todo.purpose || todo.brief}</p>
      )}
      {!compact && (todo.pillar || todo.phase) && (
        <p className="mt-1.5 truncate text-[9px] uppercase tracking-wider text-zinc-400">{[todo.phase, todo.pillar].filter(Boolean).join(' · ')}</p>
      )}
      {!compact && todo.market && (
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          {todo.market}
        </p>
      )}
    </div>
  );
});

export default function CalendarBoard({
  todos,
  interactive,
  initialView = 'week',
  initialDate,
  previewMode = false,
  onToggleStatus,
  onViewStateChange,
}: {
  todos: Todo[];
  interactive: boolean;
  initialView?: ViewMode;
  /** 打开日历时定位到该日期（YYYY-MM-DD） */
  initialDate?: string;
  /** 付费墙预览：锁定周视图，每天展示完整 To-Do */
  previewMode?: boolean;
  onToggleStatus?: (id: string) => void;
  onViewStateChange?: (state: {
    mode: ViewMode;
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
  }) => void;
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const router = useRouter();
  const previewAnchor = todos[0]?.date ? startOfWeek(todos[0].date) : todayStr();
  const resolvedInitialDate =
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : todayStr();
  const [view, setView] = useState<ViewMode>(previewMode ? 'week' : initialView);
  const [anchor, setAnchor] = useState<string>(
    previewMode ? previewAnchor : initialView === 'day' ? resolvedInitialDate : todayStr()
  );
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewMode) return;
    setView('week');
    setAnchor(previewAnchor);
  }, [previewMode, previewAnchor]);

  useEffect(() => {
    if (previewMode || initialView !== 'day' || !initialDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return;
    setAnchor(initialDate);
    setView('day');
  }, [initialDate, initialView, previewMode]);

  const byDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (channelFilter !== 'all' && t.channelId !== channelFilter) continue;
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
    }
    return map;
  }, [channelFilter, todos]);

  const channels = useMemo(
    () => [...new Map(todos.map((todo) => [todo.channelId, todo.channelName])).entries()],
    [todos]
  );

  const openTask = (id: string) => router.push(`/app/calendar/task/${id}`);
  const prefetchTask = (id: string) => router.prefetch(`/app/calendar/task/${id}`);

  const weekdays = isZh ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS_EN;
  const today = todayStr();

  const formatDayLabel = (date: string) =>
    parseDateStr(date).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  const weekDates = useMemo(() => {
    const ws = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [anchor]);

  const monthDates = useMemo(() => {
    const first = startOfMonth(anchor);
    const total = daysInMonth(anchor);
    return Array.from({ length: total }, (_, i) => addDays(first, i));
  }, [anchor]);

  const weekdayLabel = (date: string) => {
    const idx = (parseDateStr(date).getDay() + 6) % 7;
    return weekdays[idx];
  };

  // 周视图焦点日：默认当天（当天在本周时），点表头可切换
  const weekFocus =
    focusDate && weekDates.includes(focusDate)
      ? focusDate
      : weekDates.includes(today)
        ? today
        : weekDates[0];

  const monthFocus =
    focusDate && monthDates.includes(focusDate)
      ? focusDate
      : monthDates.includes(today)
        ? today
        : monthDates[0];

  const scrollTargetDate = view === 'month' ? monthFocus : weekFocus;

  // 周 / 月视图打开后自动滚动到今天（或焦点日）
  useEffect(() => {
    if (view === 'day') return;
    const timer = window.setTimeout(() => {
      todayRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [view, anchor, scrollTargetDate]);

  const openDayView = (date: string) => {
    setAnchor(date);
    setView('day');
    setFocusDate(date);
  };

  useEffect(() => {
    if (!onViewStateChange) return;
    if (view === 'day') {
      onViewStateChange({ mode: view, date: anchor });
      return;
    }
    if (view === 'week') {
      onViewStateChange({
        mode: view,
        date: weekFocus,
        rangeStart: weekDates[0],
        rangeEnd: weekDates[6],
      });
      return;
    }
    const first = startOfMonth(anchor);
    onViewStateChange({
      mode: view,
      date: monthFocus,
      rangeStart: first,
      rangeEnd: addDays(first, daysInMonth(anchor) - 1),
    });
  }, [anchor, monthDates, monthFocus, onViewStateChange, view, weekDates, weekFocus]);

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
      {/* 头部：标题 + 视图切换（预览模式精简） */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-ink">
            Launch Calendar
          </h1>
          <span className="hidden text-sm text-zinc-400 sm:inline">{periodLabel}</span>
        </div>

        {!previewMode && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-paper-dim p-0.5">
              {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === v ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {v === 'day' ? (isZh ? '日' : 'Day') : v === 'week' ? (isZh ? '周' : 'Week') : isZh ? '月' : 'Month'}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-full bg-paper-dim p-0.5">
              <button onClick={() => shift(-1)} className="rounded-full px-2.5 py-1.5 text-ink-muted hover:text-ink" aria-label="prev">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                onClick={() => setAnchor(todayStr())}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
              >
                {isZh ? '今天' : 'Today'}
              </button>
              <button onClick={() => shift(1)} className="rounded-full px-2.5 py-1.5 text-ink-muted hover:text-ink" aria-label="next">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {!previewMode && <p className="px-4 pt-1 text-xs text-zinc-400 sm:hidden">{periodLabel}</p>}

      {channels.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto px-4 pb-2 sm:px-6">
          <button
            onClick={() => setChannelFilter('all')}
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${channelFilter === 'all' ? 'bg-ink text-white' : 'bg-paper-dim text-zinc-500'}`}
          >
            {isZh ? '全部渠道' : 'All channels'}
          </button>
          {channels.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setChannelFilter(id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${channelFilter === id ? 'bg-ink text-white' : 'bg-paper-dim text-zinc-500'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* 视图主体 */}
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto p-4 pt-2 sm:p-6 sm:pt-2"
      >
        {(previewMode || view === 'week') && (
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {weekDates.map((date) => {
              const dayTodos = byDate.get(date) ?? [];
              const isToday = date === today;
              const isFocus = date === weekFocus;
              const shouldScrollHere = date === scrollTargetDate;
              return (
                <DayRow
                  key={date}
                  ref={shouldScrollHere ? todayRowRef : undefined}
                  date={date}
                  weekday={weekdayLabel(date)}
                  dayLabel={formatDayLabel(date)}
                  isToday={isToday}
                  isFocus={isFocus}
                  todos={dayTodos}
                  interactive={interactive}
                  compact={!previewMode && !isFocus}
                  previewMode={previewMode}
                  isZh={isZh}
                  onFocus={() => !previewMode && setFocusDate(date)}
                  onOpen={openTask}
                  onPrefetch={prefetchTask}
                  onToggleStatus={onToggleStatus}
                />
              );
            })}
          </div>
        )}

        {!previewMode && view === 'day' && (
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-paper-dim/60 px-4 py-3">
              <div>
                <p className="index-label">{weekdayLabel(anchor)}</p>
                <p className="text-lg font-bold text-ink">
                  {formatDayLabel(anchor)}
                  {anchor === today && (
                    <span className="ml-2 text-xs font-medium text-zinc-500">
                      {isZh ? '今天' : 'Today'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {(byDate.get(anchor) ?? []).length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-400">
                {isZh ? '这一天没有安排任务 — 休息也是策略的一部分。' : 'Nothing scheduled — rest is part of the strategy.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {(byDate.get(anchor) ?? []).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-stretch gap-0 overflow-hidden rounded-2xl bg-paper-dim/50"
                  >
                    <div className="flex w-16 shrink-0 items-center justify-center bg-paper-dim font-mono text-xs text-zinc-500">
                      {t.time ?? '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => interactive && openTask(t.id)}
                      onMouseEnter={() => interactive && prefetchTask(t.id)}
                      className={`flex min-w-0 flex-1 items-center gap-3 p-4 text-left ${interactive ? 'hover:bg-paper-dim' : 'cursor-default'}`}
                    >
                      <DoneBall
                        done={t.status === 'done'}
                        size="lg"
                        onToggle={
                          interactive && onToggleStatus
                            ? () => onToggleStatus(t.id)
                            : undefined
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[15px] font-semibold text-ink ${
                            t.status === 'done' ? 'line-through opacity-55' : ''
                          }`}
                        >
                          {t.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                          {t.purpose || t.brief}
                        </p>
                        {(t.market || t.audience) && (
                          <p className="mt-1 text-[11px] text-zinc-400">
                            {[t.market, t.audience].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="hidden shrink-0 text-[11px] font-medium text-zinc-500 sm:inline">
                        {t.channelName}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!previewMode && view === 'month' && (
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {monthDates.map((date) => {
              const dayTodos = byDate.get(date) ?? [];
              const isToday = date === today;
              const isFocus = date === monthFocus;
              const shouldScrollHere = date === scrollTargetDate;
              return (
                <DayRow
                  key={date}
                  ref={shouldScrollHere ? todayRowRef : undefined}
                  date={date}
                  weekday={weekdayLabel(date)}
                  dayLabel={formatDayLabel(date)}
                  isToday={isToday}
                  isFocus={isFocus}
                  todos={dayTodos}
                  interactive={interactive}
                  compact={!isFocus}
                  previewMode={false}
                  isZh={isZh}
                  onFocus={() => setFocusDate(date)}
                  onOpenDay={() => openDayView(date)}
                  onOpen={openTask}
                  onPrefetch={prefetchTask}
                  onToggleStatus={onToggleStatus}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const DayRow = forwardRef(function DayRow(
  {
    date,
    weekday,
    dayLabel,
    isToday,
    isFocus,
    todos,
    interactive,
    compact,
    previewMode,
    isZh,
    onFocus,
    onOpenDay,
    onOpen,
    onPrefetch,
    onToggleStatus,
  }: {
    date: string;
    weekday: string;
    dayLabel: string;
    isToday: boolean;
    isFocus: boolean;
    todos: Todo[];
    interactive: boolean;
    compact: boolean;
    previewMode: boolean;
    isZh: boolean;
    onFocus?: () => void;
    onOpenDay?: () => void;
    onOpen: (id: string) => void;
    onPrefetch?: (id: string) => void;
    onToggleStatus?: (id: string) => void;
  },
  ref: Ref<HTMLDivElement>
) {
  const dayNum = parseDateStr(date).getDate();

  return (
    <div
      ref={ref}
      className={`flex gap-3 overflow-hidden rounded-2xl sm:gap-4 ${
        isFocus ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]' : 'bg-white/80'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          if (onOpenDay) onOpenDay();
          else onFocus?.();
        }}
        disabled={previewMode && !onFocus && !onOpenDay}
        className={`flex w-[72px] shrink-0 flex-col items-center justify-start rounded-l-2xl px-2 py-4 text-center transition-colors sm:w-24 ${
          isToday
            ? 'bg-ink text-white'
            : isFocus
              ? 'bg-paper-dim'
              : 'bg-paper-dim/60 hover:bg-paper-dim'
        } ${previewMode ? 'cursor-default' : 'cursor-pointer'}`}
        title={
          onOpenDay
            ? isZh
              ? '点击查看当天任务'
              : 'Open day view'
            : onFocus
              ? isZh
                ? '点击展开这一天'
                : 'Click to expand this day'
              : undefined
        }
      >
        <span className={`index-label ${isToday ? '!text-zinc-300' : ''}`}>{weekday}</span>
        <span className={`mt-1 text-2xl font-bold leading-none sm:text-3xl ${isToday ? 'text-white' : 'text-ink'}`}>
          {dayNum}
        </span>
        <span className={`mt-1 text-[10px] font-medium ${isToday ? 'text-zinc-300' : 'text-zinc-400'}`}>
          {dayLabel}
        </span>
        {isToday && (
          <span className={`mt-2 text-[9px] font-semibold uppercase tracking-wider ${isToday ? 'text-brand-300' : ''}`}>
            {isZh ? '今天' : 'Today'}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 py-3 pr-3 sm:py-4 sm:pr-4">
        {todos.length === 0 ? (
          <p className="flex h-full min-h-[72px] items-center text-sm text-zinc-400">
            {isZh ? '暂无任务' : 'No tasks'}
          </p>
        ) : (
          <div className="space-y-2">
            {todos.map((t) => (
              <TodoCard
                key={t.id}
                todo={t}
                interactive={interactive}
                compact={compact}
                onOpen={onOpen}
                onPrefetch={onPrefetch}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

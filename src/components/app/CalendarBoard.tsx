'use client';

/**
 * 行动日历 — 纵向列表展示全部 To-Do
 * - 默认展示全部日期（从最早到最晚），不再按日 / 周 / 月截断
 * - 「今天」按钮滚动并聚焦到本日
 * - 付费墙预览仍锁定为周视图
 */

import { forwardRef, memo, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { Todo } from '@/lib/gtm/types';
import {
  addDays,
  formatShort,
  parseDateStr,
  startOfWeek,
  todayStr,
  WEEKDAY_LABELS_EN,
  WEEKDAY_LABELS_ZH,
} from '@/lib/gtm/dates';

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
    <span className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-white text-black`}>
      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </span>
  ) : (
    <span
      className={`block ${dim} shrink-0 rounded-full border-2 border-white/20 bg-transparent transition-colors ${
        onToggle ? 'hover:border-white/50' : ''
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
  /** 紧凑模式（非焦点日）：隐藏副标题与市场标签 */
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
      className={`block w-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-left transition-colors ${
        interactive
          ? 'cursor-pointer hover:border-white/20 hover:bg-white/[0.045]'
          : 'cursor-default'
      } ${todo.status === 'done' ? 'opacity-55' : ''}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[10px] font-medium tracking-wide text-zinc-500">{todo.channelName}</span>
          {todo.launchStatus && (
            <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] uppercase text-zinc-500">
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
        className={`mt-2 text-[13px] font-semibold leading-snug text-white ${
          todo.status === 'done' ? 'line-through text-zinc-500' : ''
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

function datesInRange(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export default function CalendarBoard({
  todos,
  interactive,
  initialDate,
  initialChannelFilter = 'all',
  previewMode = false,
  onToggleStatus,
  onViewStateChange,
}: {
  todos: Todo[];
  interactive: boolean;
  /** 打开日历时定位到该日期（YYYY-MM-DD） */
  initialDate?: string;
  /** Deep-link channel tab from Partner todo cards */
  initialChannelFilter?: string;
  /** 付费墙预览：锁定周视图，每天展示完整 To-Do */
  previewMode?: boolean;
  onToggleStatus?: (id: string) => void;
  onViewStateChange?: (state: {
    mode: 'all' | 'week';
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
  const [focusDate, setFocusDate] = useState<string | null>(
    previewMode ? null : resolvedInitialDate
  );
  const [channelFilter, setChannelFilter] = useState<string>(
    initialChannelFilter || 'all'
  );
  const todayRowRef = useRef<HTMLDivElement>(null);
  const [scrollNonce, setScrollNonce] = useState(0);

  useEffect(() => {
    if (previewMode || !initialChannelFilter) return;
    setChannelFilter(initialChannelFilter);
  }, [initialChannelFilter, previewMode]);

  useEffect(() => {
    if (previewMode || !initialDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return;
    setFocusDate(initialDate);
  }, [initialDate, previewMode]);

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
    const ws = startOfWeek(previewAnchor);
    const all = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    if (channelFilter === 'all') return all;
    return all.filter((date) => (byDate.get(date)?.length ?? 0) > 0);
  }, [previewAnchor, byDate, channelFilter]);

  const allDates = useMemo(() => {
    const dates = [...byDate.keys()].sort();
    if (dates.length === 0) return [];
    // 选中具体渠道时，只保留有 Todo 的日期；全部渠道则补齐连续区间
    if (channelFilter !== 'all') return dates;
    return datesInRange(dates[0]!, dates[dates.length - 1]!);
  }, [byDate, channelFilter]);

  const displayDates = previewMode ? weekDates : allDates;

  const weekdayLabel = (date: string) => {
    const idx = (parseDateStr(date).getDay() + 6) % 7;
    return weekdays[idx];
  };

  const focus =
    focusDate && displayDates.includes(focusDate)
      ? focusDate
      : displayDates.includes(today)
        ? today
        : displayDates[0];

  const scrollTargetDate =
    focusDate && displayDates.includes(focusDate)
      ? focusDate
      : displayDates.includes(today)
        ? today
        : displayDates[0];

  const jumpToToday = () => {
    setFocusDate(today);
    setScrollNonce((n) => n + 1);
  };

  // 打开后 / 点「今天」或聚焦某天后，将该日顶部对齐列表顶部
  useEffect(() => {
    if (!scrollTargetDate) return;
    const timer = window.setTimeout(() => {
      todayRowRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [scrollTargetDate, channelFilter, scrollNonce]);

  useEffect(() => {
    if (!onViewStateChange) return;
    if (previewMode) {
      const ws = startOfWeek(previewAnchor);
      onViewStateChange({
        mode: 'week',
        date: focus,
        rangeStart: ws,
        rangeEnd: addDays(ws, 6),
      });
      return;
    }
    onViewStateChange({
      mode: 'all',
      date: focus,
      rangeStart: allDates[0],
      rangeEnd: allDates[allDates.length - 1],
    });
  }, [allDates, focus, onViewStateChange, previewAnchor, previewMode]);

  const periodLabel = useMemo(() => {
    if (previewMode) {
      const ws = startOfWeek(previewAnchor);
      return `${formatShort(ws, locale)} – ${formatShort(addDays(ws, 6), locale)}`;
    }
    if (allDates.length === 0) {
      return isZh ? '全部任务' : 'All tasks';
    }
    if (allDates.length === 1) {
      return formatShort(allDates[0]!, locale);
    }
    return `${formatShort(allDates[0]!, locale)} – ${formatShort(allDates[allDates.length - 1]!, locale)}`;
  }, [allDates, isZh, locale, previewAnchor, previewMode]);

  const emptyLabel = previewMode
    ? isZh
      ? '本周该渠道没有安排任务。'
      : 'No tasks for this channel this week.'
    : isZh
      ? '该渠道没有安排任务。'
      : 'No tasks for this channel.';

  return (
    <div className="flex h-full flex-col">
      {/* 头部：标题 + 今天 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
            Launch Calendar
          </h1>
          <span className="hidden text-xs text-zinc-500 sm:inline">{periodLabel}</span>
        </div>

        {!previewMode && (
          <button
            type="button"
            onClick={jumpToToday}
            className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.045] hover:text-white"
          >
            {isZh ? '今天' : 'Today'}
          </button>
        )}
      </div>

      {!previewMode && <p className="px-4 pt-2 text-[11px] text-zinc-500 sm:hidden sm:px-6">{periodLabel}</p>}

      {channels.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto px-4 pb-1.5 pt-2 sm:px-6">
          <button
            onClick={() => setChannelFilter('all')}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
              channelFilter === 'all'
                ? 'border-white/20 bg-white text-black'
                : 'border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/20 hover:text-zinc-300'
            }`}
          >
            {isZh ? '全部渠道' : 'All channels'}
          </button>
          {channels.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setChannelFilter(id)}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                channelFilter === id
                  ? 'border-white/20 bg-white text-black'
                  : 'border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/20 hover:text-zinc-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* 视图主体 */}
      <div className="min-h-0 flex-1 overflow-auto p-4 pt-2 sm:p-6 sm:pt-2">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {displayDates.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-500">{emptyLabel}</p>
          ) : (
            displayDates.map((date) => {
              const dayTodos = byDate.get(date) ?? [];
              const isToday = date === today;
              const isFocus = date === focus;
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
                  onFocus={() => {
                    if (previewMode) return;
                    setFocusDate(date);
                    setScrollNonce((n) => n + 1);
                  }}
                  onOpen={openTask}
                  onPrefetch={prefetchTask}
                  onToggleStatus={onToggleStatus}
                />
              );
            })
          )}
        </div>
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
      className={`flex gap-3 overflow-hidden rounded-2xl border transition-colors sm:gap-4 ${
        isFocus
          ? 'border-white/20 bg-white/[0.045]'
          : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]'
      }`}
    >
      <button
        type="button"
        onClick={() => onFocus?.()}
        disabled={previewMode && !onFocus}
        className={`flex w-[72px] shrink-0 flex-col items-center justify-start border-r px-2 py-4 text-center transition-colors sm:w-24 ${
          isToday
            ? 'border-brand-300/25 bg-black/55 text-white shadow-[inset_0_0_24px_rgba(213,250,123,0.12),0_0_18px_rgba(213,250,123,0.14)]'
            : 'border-white/[0.06] text-zinc-400 hover:text-white'
        } ${previewMode ? 'cursor-default' : 'cursor-pointer'}`}
        title={
          onFocus
            ? isZh
              ? '点击展开这一天'
              : 'Click to expand this day'
            : undefined
        }
      >
        <span className={`index-label ${isToday ? '!text-brand-300/70' : ''}`}>{weekday}</span>
        <span className="mt-1 text-2xl font-bold leading-none text-white sm:text-3xl">
          {dayNum}
        </span>
        <span className={`mt-1 text-[10px] font-medium ${isToday ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {dayLabel}
        </span>
        {isToday && (
          <span className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-brand-300/80">
            {isZh ? '今天' : 'Today'}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 py-3 pr-3 sm:py-4 sm:pr-4">
        {todos.length === 0 ? (
          <p className="flex h-full min-h-[72px] items-center text-sm text-zinc-500">
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

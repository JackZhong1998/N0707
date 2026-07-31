'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { todayStr } from '@/lib/gtm/dates';
import { channelHasCalendarTodos } from '@/lib/gtm/channel-capabilities';
import ChannelLogo from '@/components/ChannelLogo';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import type { LaunchTaskStatus, Todo } from '@/lib/gtm/types';

const statusStyle: Record<LaunchTaskStatus, string> = {
  planned: 'bg-zinc-500/10 text-zinc-400',
  generating: 'bg-sky-400/10 text-sky-300',
  draft: 'bg-zinc-400/10 text-zinc-300',
  ready: 'bg-emerald-400/12 text-emerald-300',
  needs_action: 'bg-amber-300/12 text-amber-200',
  publishing: 'bg-sky-400/10 text-sky-300',
  published: 'bg-emerald-400/12 text-emerald-300',
  completed: 'bg-emerald-400/12 text-emerald-300',
  skipped: 'bg-zinc-500/10 text-zinc-500',
  failed: 'bg-red-400/10 text-red-300',
  replanning: 'bg-orange-400/10 text-orange-300',
};

function effectiveStatus(todo: Todo): LaunchTaskStatus {
  if (todo.publishedUrl || todo.publishedAt || todo.linkStatus === 'pending') return 'published';
  if (todo.status === 'done') return 'completed';
  if (todo.status === 'skipped') return 'skipped';
  return todo.launchStatus ?? (todo.contentStatus === 'ready' ? 'ready' : 'planned');
}

export default function LaunchCommandCenter() {
  const { store } = useGtm();
  const isZh = useLocale() !== 'en';
  const { setViewContext, clearViewContext } = useViewContext();
  const launch = store.launch!;
  const today = todayStr();
  const currentDay = Math.max(1, Math.min(30, Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${launch.project.startDate}T12:00:00`).getTime()) / 86_400_000) + 1));
  const currentWeek = Math.min(4, Math.ceil(currentDay / 7));
  const todayTasks = useMemo(
    () => store.todos.filter((todo) => todo.date === today || todo.dayIndex === currentDay),
    [currentDay, store.todos, today]
  );
  const completed = store.todos.filter((todo) => ['done'].includes(todo.status) || Boolean(todo.publishedUrl)).length;
  const ready = store.todos.filter((todo) => ['ready', 'draft'].includes(effectiveStatus(todo))).length;
  const published = store.todos.filter((todo) => Boolean(todo.publishedAt) || Boolean(todo.publishedUrl) || effectiveStatus(todo) === 'published').length;
  const pendingLinks = store.todos.filter((todo) => todo.linkStatus === 'pending' && !todo.publishedUrl);
  const blockers = store.todos.filter((todo) => effectiveStatus(todo) === 'needs_action').length + pendingLinks.length + launch.directories.filter((item) => item.status === 'needs_action').length;

  useEffect(() => {
    setViewContext({
      view: 'launch_command_center',
      entityType: 'launch_project',
      entityId: launch.project.id,
      title: isZh ? `冷启动工作台 · 第 ${currentDay} 天` : `Launch Command Center · Day ${currentDay}`,
      section: `Week ${currentWeek}`,
      revision: launch.project.updatedAt,
    });
    return clearViewContext;
  }, [clearViewContext, currentDay, currentWeek, isZh, launch.project.id, launch.project.updatedAt, setViewContext]);

  const week = launch.blueprint?.weeks[currentWeek - 1];
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">{launch.project.productName} · {isZh ? '30 天冷启动' : '30-Day Launch'}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
            {isZh ? `冷启动第 ${currentDay} 天` : `Day ${currentDay} of your 30-day launch`}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{isZh ? `第 ${currentWeek} 周` : `Week ${currentWeek}`} · {week?.objective}</p>
        </div>
        <Link href="/app/calendar" className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.09] hover:text-white">
          {isZh ? '查看完整日历 →' : 'Open Launch Calendar →'}
        </Link>
      </header>

      <section className="mt-7 grid grid-cols-2 gap-2 lg:grid-cols-6">
        {[
          [isZh ? '进度' : 'Progress', `${completed}/${store.todos.length}`, `${Math.round((completed / Math.max(1, store.todos.length)) * 100)}%`],
          [isZh ? '内容已备好' : 'Prepared', String(ready), isZh ? '等待审核或发布' : 'review or publish'],
          [isZh ? '已发布' : 'Published', String(published), isZh ? '已记录公开链接' : 'with public URLs'],
          [isZh ? '目录提交' : 'Directories', String(launch.directories.filter((item) => ['submitted', 'under_review', 'published'].includes(item.status)).length), `/${launch.directories.length}`],
          [isZh ? '需要你处理' : 'Needs action', String(blockers), blockers ? (isZh ? '正在等待' : 'blocking') : (isZh ? '一切顺利' : 'clear')],
          [isZh ? '渠道团队' : 'Team', String(Object.keys(launch.channelPlans).length), isZh ? '位渠道专员' : 'Channel Agents'],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
            <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">{label}</p>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{detail}</p>
          </div>
        ))}
      </section>

      {pendingLinks.length > 0 && (
        <section className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-amber-200">
                {isZh
                  ? `${pendingLinks.length} 条已发布内容待补原帖链接`
                  : `${pendingLinks.length} published posts need their public URLs`}
              </p>
              <p className="mt-1 text-[10px] text-amber-100/50">
                {isZh
                  ? '任务本身已完成；补充有效链接后会自动进入追踪。'
                  : 'Publishing is complete; saving a valid URL starts tracking.'}
              </p>
            </div>
            <Link
              href={`/app/calendar/task/${pendingLinks[0]!.id}`}
              className="rounded-full bg-amber-200 px-4 py-2 text-xs font-semibold text-amber-950"
            >
              {isZh ? '去补链接 →' : 'Add URL →'}
            </Link>
          </div>
        </section>
      )}

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <section>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{isZh ? '今天的任务' : "Today's Launch Queue"}</p>
              <h2 className="mt-1 text-lg font-bold text-white">{isZh ? '先从最重要的一件开始' : 'Start with the highest-leverage work'}</h2>
            </div>
            <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] text-zinc-500">{todayTasks.length} {isZh ? '项' : 'tasks'}</span>
          </div>
          <div className="mt-4 space-y-2">
            {(todayTasks.length ? todayTasks : store.todos.filter((todo) => todo.dayIndex <= 2).slice(0, 5)).map((todo) => {
              const status = effectiveStatus(todo);
              return (
                <Link key={todo.id} href={`/app/calendar/task/${todo.id}`} className="group grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.055] sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]"><ChannelLogo channelId={todo.channelId} size={20} /></span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">{todo.channelName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${statusStyle[status]}`}>{status.replace('_', ' ')}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-zinc-100">{todo.title}</span>
                    <span className="mt-1 block truncate text-xs text-zinc-500">{todo.purpose || todo.brief}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-zinc-600">
                    {todo.time && <span className="font-mono">{todo.time}</span>}
                    <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{isZh ? '本周主线' : 'This Week'}</p>
          <h2 className="mt-3 text-xl font-bold text-white">{week?.objective}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">{week?.narrative}</p>
          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{isZh ? '本周内容主线' : 'Shared pillars'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {launch.blueprint?.campaignPillars.slice(0, 4).map((pillar) => (
                <span key={pillar} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-zinc-400">{pillar}</span>
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs">
            <span className="text-zinc-600">{isZh ? '下次每周复盘' : 'Next weekly review'}</span>
            <Link href="/app/reviews" className="font-semibold text-zinc-300 hover:text-white">Day {Math.min(30, currentWeek * 7)} →</Link>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{isZh ? '你的渠道团队' : 'Your Channel Agents'}</p>
            <h2 className="mt-1 text-lg font-bold text-white">{isZh ? '目标一致，打法各不相同' : 'One campaign, channel-native execution'}</h2>
          </div>
          <Link href="/app/channels" className="text-xs font-semibold text-zinc-500 hover:text-white">{isZh ? '查看全部 →' : 'View all →'}</Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(launch.channelPlans).slice(0, 6).map((plan) => {
            // Directory reports submission progress instead of calendar todos.
            const isPipeline = !channelHasCalendarTodos(plan.channelId);
            const channelTasks = store.todos.filter((todo) => todo.channelId === plan.channelId);
            const channelDone = isPipeline
              ? launch.directories.filter((item) => ['submitted', 'under_review', 'published'].includes(item.status)).length
              : channelTasks.filter((todo) => todo.status === 'done' || todo.publishedUrl).length;
            const channelReady = isPipeline
              ? launch.directories.filter((item) => ['matched', 'prepared', 'needs_action'].includes(item.status)).length
              : channelTasks.filter((todo) => ['ready', 'draft'].includes(effectiveStatus(todo))).length;
            return (
              <Link key={plan.channelId} href={isPipeline ? '/app/directories' : `/app/channels/${plan.channelId}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]"><ChannelLogo channelId={plan.channelId} size={18} /></span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{plan.channelName}{isZh ? ' 专员' : ' Agent'}</span>
                    <span className="mt-0.5 block text-[10px] text-zinc-600">{isZh ? `第 ${currentWeek} 周` : `Week ${currentWeek}`} · {week?.objective}</span>
                  </span>
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">{plan.mission}</p>
                <p className="mt-3 text-[10px] text-zinc-600">
                  {isPipeline
                    ? `${channelDone} ${isZh ? '已提交' : 'submitted'} · ${channelReady} ${isZh ? '待提交' : 'to submit'}`
                    : `${channelDone} ${isZh ? '已完成' : 'completed'} · ${channelReady} ${isZh ? '已准备' : 'ready'}`}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

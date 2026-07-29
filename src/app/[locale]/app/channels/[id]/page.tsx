'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import ChannelLogo from '@/components/ChannelLogo';

export default function ChannelWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { store } = useGtm();
  const isZh = useLocale() !== 'en';
  const { setViewContext, clearViewContext } = useViewContext();
  const [filter, setFilter] = useState<'all' | 'ready' | 'published' | 'planned'>('all');
  const plan = store.launch?.channelPlans[id];
  const tasks = useMemo(() => store.todos.filter((todo) => todo.channelId === id), [id, store.todos]);
  const shown = tasks.filter((todo) => filter === 'all' || (filter === 'published' ? Boolean(todo.publishedUrl) || todo.status === 'done' : filter === 'ready' ? ['ready', 'draft', 'needs_action'].includes(todo.launchStatus ?? '') : todo.launchStatus === 'planned'));
  const done = tasks.filter((todo) => todo.status === 'done' || todo.publishedUrl).length;
  useEffect(() => {
    if (!plan) return;
    setViewContext({ view: 'channel_workspace', entityType: 'channel_plan', entityId: id, channelId: id, title: `${plan.channelName} Agent`, section: 'Playbook & Queue', revision: plan.revision });
    return clearViewContext;
  }, [clearViewContext, id, plan, setViewContext]);
  if (!plan) return <div className="flex h-full items-center justify-center"><Link href="/app/channels" className="text-sm text-zinc-400">{isZh ? '未找到渠道，返回团队 →' : 'Channel not found. Back to team →'}</Link></div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
      <Link href="/app/channels" className="text-xs text-zinc-600 hover:text-white">← Channel Agents</Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-5 border-b border-white/[0.08] pb-7"><div className="flex items-start gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]"><ChannelLogo channelId={id} size={27} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Active · Week {Math.min(4, Math.ceil((store.launch?.project.currentDay ?? 1) / 7))}</p><h1 className="mt-1 text-3xl font-black tracking-tight text-white">{plan.channelName} Agent</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{plan.mission}</p></div></div><div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-right"><strong className="block text-xl text-white">{done}/{tasks.length}</strong><span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{isZh ? '完成进度' : 'Progress'}</span></div></header>
      <section className="mt-6 grid gap-3 lg:grid-cols-3"><div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Mission</p><p className="mt-3 text-sm leading-6 text-zinc-300">{plan.whyItMatters}</p></div><div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">{isZh ? '本周目标' : 'This week'}</p><p className="mt-3 text-sm leading-6 text-zinc-300">{plan.weeklyPlan[Math.min(3, Math.ceil((store.launch?.project.currentDay ?? 1) / 7) - 1)]}</p></div><div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">{isZh ? '当前阻塞' : 'Current blocker'}</p><p className="mt-3 text-sm leading-6 text-zinc-300">{tasks.some((todo) => todo.launchStatus === 'needs_action') ? (isZh ? '有任务需要登录、验证或确认' : 'A task needs login, verification, or confirmation') : (isZh ? '没有阻塞' : 'No blockers')}</p></div></section>
      <section className="mt-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Channel Playbook · v{plan.revision}</p><div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3"><div><h3 className="text-xs font-semibold text-white">{isZh ? '目标用户' : 'Target audience'}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{plan.targetAudience}</p></div><div><h3 className="text-xs font-semibold text-white">{isZh ? '内容支柱' : 'Content pillars'}</h3><div className="mt-2 flex flex-wrap gap-1.5">{plan.pillars.map((item) => <span key={item} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-zinc-400">{item}</span>)}</div></div><div><h3 className="text-xs font-semibold text-white">{isZh ? '形式与节奏' : 'Formats & cadence'}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{plan.formats.join(' · ')}<br />{plan.cadence}</p></div><div><h3 className="text-xs font-semibold text-white">{isZh ? '产品露出规则' : 'Product mention rules'}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{plan.productMentionRules}</p></div><div><h3 className="text-xs font-semibold text-white">{isZh ? '成功信号' : 'Success signals'}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{plan.successSignals.join(' · ')}</p></div><div><h3 className="text-xs font-semibold text-white">{isZh ? '风险与限制' : 'Risks & constraints'}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{plan.risks.join(' · ')}</p></div></div></section>
      <section className="mt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Queue</p><h2 className="mt-1 text-lg font-bold text-white">{isZh ? '30 天渠道任务' : '30-day channel tasks'}</h2></div><div className="flex rounded-full bg-white/[0.04] p-1">{(['all', 'ready', 'published', 'planned'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-3 py-1.5 text-[10px] capitalize ${filter === item ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>{item}</button>)}</div></div><div className="mt-4 space-y-2">{shown.map((todo) => <Link key={todo.id} href={`/app/calendar/task/${todo.id}`} className="grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 hover:border-white/20 sm:grid-cols-[80px_1fr_auto] sm:items-center"><span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Day {todo.dayIndex}<br />{todo.time}</span><span><strong className="block text-sm text-zinc-200">{todo.title}</strong><small className="mt-1 block text-xs text-zinc-600">{todo.purpose} · {todo.pillar}</small></span><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[9px] uppercase text-zinc-400">{todo.publishedUrl ? 'published' : todo.launchStatus ?? 'planned'}</span></Link>)}</div></section>
      <section className="mt-7 rounded-3xl border border-white/[0.08] p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Weekly Reviews</p><div className="mt-4 grid gap-2 sm:grid-cols-4">{[1, 2, 3, 4].map((week) => <div key={week} className="rounded-2xl bg-white/[0.03] p-4"><span className="text-xs font-semibold text-white">Week {week}</span><p className="mt-2 text-[10px] leading-4 text-zinc-600">{isZh ? '到期后自动读取执行信号并调整下一周。' : 'Reads execution signals and adjusts the next week when due.'}</p></div>)}</div></section>
    </div>
  );
}


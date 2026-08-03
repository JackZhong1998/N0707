'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { channelHasCalendarTodos } from '@/lib/gtm/channel-capabilities';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import ChannelLogo from '@/components/ChannelLogo';

export default function LaunchBlueprintPage() {
  const { store } = useGtm();
  const isZh = useLocale() !== 'en';
  const { setViewContext, clearViewContext } = useViewContext();
  const blueprint = store.launch?.blueprint;
  useEffect(() => {
    if (!store.launch || !blueprint) return;
    setViewContext({ view: 'launch_blueprint', entityType: 'launch_blueprint', entityId: store.launch.project.id, title: isZh ? '30 天推广蓝图' : '30-Day Campaign Launch Blueprint', revision: blueprint.revision });
    return clearViewContext;
  }, [blueprint, clearViewContext, isZh, setViewContext, store.launch]);
  if (!store.launch || !blueprint) return <div className="flex h-full items-center justify-center"><Link href="/app" className="text-sm text-zinc-400 hover:text-white">{isZh ? '先建立你的冷启动 →' : 'Build your launch first →'}</Link></div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
      <header className="border-b border-white/[0.08] pb-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">{isZh ? '30 天冷启动' : '30-Day Campaign'} · v{blueprint.revision}</p><h1 className="mt-2 max-w-3xl font-[family-name:var(--font-display)] text-3xl font-black tracking-tight text-white sm:text-4xl">{isZh ? '推广蓝图' : 'Launch Blueprint'}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{isZh ? '所有渠道都沿着这套主线推进，再根据各平台的语境分别执行。' : 'The shared campaign spine. Each channel only translates it into native execution.'}</p></div><Link href="/app/documents/project" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.06]">← {isZh ? '项目文档' : 'Project document'}</Link></div>
      </header>
      <section className="mt-7 grid gap-3 md:grid-cols-2"><div className="rounded-3xl border border-brand-400/20 bg-brand-400/[0.04] p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-brand-300/70">{isZh ? '本轮目标' : 'Campaign Goal'}</p><p className="mt-4 text-xl font-bold leading-8 text-white">{blueprint.campaignGoal}</p></div><div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{isZh ? '核心定位' : 'Core Positioning'}</p><p className="mt-4 text-xl font-bold leading-8 text-white">{blueprint.corePositioning}</p><p className="mt-3 text-sm text-zinc-500">{blueprint.targetAudience}</p></div></section>
      <section className="mt-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{isZh ? '内容主线' : 'Campaign Pillars'}</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{blueprint.campaignPillars.map((pillar, index) => <div key={pillar} className="rounded-2xl bg-white/[0.045] p-4"><span className="text-[10px] text-brand-300">0{index + 1}</span><p className="mt-4 text-sm font-semibold leading-5 text-white">{pillar}</p></div>)}</div></section>
      <section className="mt-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{isZh ? '四周推进节奏' : 'Four-Week Narrative'}</p><div className="mt-5 grid gap-2 lg:grid-cols-4">{blueprint.weeks.map((week) => <div key={week.week} className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.035] p-5"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">{isZh ? `第 ${week.week} 周` : `Week ${week.week}`}</span><h3 className="mt-3 text-base font-bold text-white">{week.objective}</h3><p className="mt-3 text-xs leading-5 text-zinc-500">{week.narrative}</p><div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px]"><span className="text-zinc-600">{isZh ? '产品露出' : 'Product intensity'}</span><span className="uppercase text-zinc-300">{week.productIntensity}</span></div></div>)}</div></section>
      <section className="mt-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{isZh ? '渠道分工' : 'Channel Roles'}</p><p className="mt-2 text-sm text-zinc-500">{isZh ? '所有已支持渠道会自动加入，再根据产品与用户分配不同角色。' : 'There is no channel picker; every supported channel joins automatically.'}</p></div><Link href="/app/channels" className="text-xs font-semibold text-zinc-400 hover:text-white">{isZh ? '查看渠道团队' : 'Channel Agents'} →</Link></div><div className="mt-5 grid gap-2 md:grid-cols-2">{blueprint.channelRoles.map((role) => <Link key={role.channelId} href={channelHasCalendarTodos(role.channelId) ? `/app/channels/${role.channelId}` : '/app/directories'} className="flex items-start gap-3 rounded-2xl bg-white/[0.035] p-4 hover:bg-white/[0.06]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]"><ChannelLogo channelId={role.channelId} size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm text-white">{role.channelName}</strong><span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase text-zinc-500">{role.priority}</span></span><span className="mt-1.5 block text-xs leading-5 text-zinc-500">{role.role}</span></span></Link>)}</div></section>
      <section className="mt-4 rounded-3xl border border-white/[0.08] p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{isZh ? '全渠道共同边界' : 'Global Guardrails'}</p><div className="mt-4 grid gap-2 md:grid-cols-2">{blueprint.guardrails.map((guardrail) => <p key={guardrail} className="flex gap-3 rounded-xl bg-white/[0.025] p-3 text-xs leading-5 text-zinc-400"><span className="text-emerald-400">✓</span>{guardrail}</p>)}</div><p className="mt-5 border-t border-white/[0.07] pt-4 text-xs text-zinc-500"><strong className="text-zinc-300">{isZh ? '内容语言' : 'Language'} · </strong>{blueprint.language}</p></section>
    </div>
  );
}

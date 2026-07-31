'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import ChannelLogo from '@/components/ChannelLogo';
import {
  capabilityLabels,
  channelHasCalendarTodos,
  getChannelCapability,
} from '@/lib/gtm/channel-capabilities';

export default function ChannelAgentsPage() {
  const { store } = useGtm();
  const isZh = useLocale() !== 'en';
  const { setViewContext, clearViewContext } = useViewContext();
  const plans = useMemo(
    () => Object.values(store.launch?.channelPlans ?? {}),
    [store.launch?.channelPlans]
  );
  const roles = store.launch?.blueprint?.channelRoles ?? [];
  const plansRevision = plans.reduce((sum, plan) => sum + plan.revision, 0);

  useEffect(() => {
    setViewContext({
      view: 'channel_agents',
      entityType: 'channel_plan_collection',
      title: isZh ? '渠道团队' : 'Channel Agents',
      revision: plansRevision,
    });
    return clearViewContext;
  }, [clearViewContext, isZh, plansRevision, setViewContext]);

  if (!store.launch) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/app" className="text-sm text-zinc-400">
          {isZh ? '先建立冷启动 →' : 'Build your launch first →'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
          {isZh ? `推广团队 · ${plans.length} 位渠道专员` : `Launch Team · ${plans.length} Agents`}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black tracking-tight text-white">
          {isZh ? '各个平台，分别怎么做' : 'Channel strategy overview'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          {isZh
            ? '这里先展示每个渠道的角色、优先级、发布节奏、第一周目标和成功信号。进入单个渠道，可查看完整打法。'
            : 'Default view: role, priority, cadence, Week 1 focus, and success signals. Open a channel for the full playbook.'}
        </p>
      </header>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const role = roles.find((item) => item.channelId === plan.channelId);
          const capability = getChannelCapability(plan.channelId);
          const href = channelHasCalendarTodos(plan.channelId)
            ? `/app/channels/${plan.channelId}`
            : '/app/directories';
          return (
            <Link
              key={plan.channelId}
              href={href}
              className="group rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <ChannelLogo channelId={plan.channelId} size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-base text-white">
                    {plan.channelName}{isZh ? ' 专员' : ' Agent'}
                  </strong>
                  <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                    {role?.role || plan.mission}
                  </span>
                </span>
                {role?.priority && (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                    {role.priority}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {capabilityLabels(capability, isZh).map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/[0.05] px-2 py-1 text-[9px] text-zinc-500"
                  >
                    {label}
                  </span>
                ))}
                {capability.publishAction === 'none' && (
                  <span className="rounded-full bg-white/[0.05] px-2 py-1 text-[9px] text-zinc-500">
                    {isZh ? '仅提供规划和制作方案' : 'Planning/production only'}
                  </span>
                )}
              </div>
              <dl className="mt-4 space-y-2 text-xs leading-5 text-zinc-500">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    {isZh ? '频率' : 'Cadence'}
                  </dt>
                  <dd className="mt-1 text-zinc-400">{plan.cadence}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    {isZh ? '第一周目标' : 'Week 1 focus'}
                  </dt>
                  <dd className="mt-1 line-clamp-2 text-zinc-400">
                    {plan.weeklyPlan[0] || plan.mission}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    {isZh ? '成功信号' : 'Success signals'}
                  </dt>
                  <dd className="mt-1 line-clamp-2 text-zinc-400">
                    {plan.successSignals.slice(0, 2).join(' · ')}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[11px] text-zinc-600 transition group-hover:text-zinc-400">
                {isZh ? '查看完整打法 →' : 'Open full playbook →'}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

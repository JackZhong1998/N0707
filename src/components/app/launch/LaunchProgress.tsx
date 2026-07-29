'use client';

import { useLocale } from 'next-intl';
import type { LaunchState } from '@/lib/gtm/types';

export default function LaunchProgress({ launch }: { launch: LaunchState }) {
  const isZh = useLocale() !== 'en';
  const doneCount = launch.researchProgress.filter((step) =>
    ['done', 'warning'].includes(step.status)
  ).length;
  const total = launch.researchProgress.length;
  const active = launch.researchProgress.find((step) => step.status === 'running');
  const isCampaignBuild = launch.project.phase === 'building_team';

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="w-full max-w-2xl">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-300">
            {isCampaignBuild
              ? isZh
                ? '正在组建 30 天 Agent Team'
                : 'Assembling your 30-day Agent Team'
              : isZh
                ? '正在免费分析产品'
                : 'Free product analysis'}
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-black tracking-tight text-white sm:text-4xl">
            {launch.project.productName}
          </h1>
          <p className="mt-2 truncate text-sm text-zinc-500">{launch.project.productUrl}</p>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
            <p className="text-sm text-zinc-300">
              {active?.label ||
                (isZh ? '正在整理结果' : 'Organizing results')}
            </p>
            <p className="text-xs font-semibold tabular-nums text-zinc-500">
              {doneCount}/{total}
            </p>
          </div>

          <div className="mt-4 space-y-1.5">
            {launch.researchProgress.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 rounded-2xl px-3 py-3.5 ${step.status === 'running' ? 'bg-white/[0.07]' : ''}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    step.status === 'done'
                      ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                      : step.status === 'warning'
                        ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                        : step.status === 'running'
                          ? 'border-white/30 bg-white text-black'
                          : 'border-white/10 text-zinc-700'
                  }`}
                >
                  {step.status === 'done' ? (
                    '✓'
                  ) : step.status === 'warning' ? (
                    '!'
                  ) : step.status === 'running' ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
                  ) : (
                    '·'
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm ${
                      step.status === 'pending'
                        ? 'text-zinc-700'
                        : step.status === 'running'
                          ? 'font-semibold text-white'
                          : 'text-zinc-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.detail && (
                    <p className="mt-1 text-xs leading-5 text-zinc-600">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs leading-5 text-zinc-600">
            {isZh
              ? '进度由后台任务持续保存。你可以离开、刷新或换设备，回来后会恢复真实进度。'
              : 'Progress is saved by the background worker. You can leave, refresh, or switch devices and return to the real status.'}
          </p>
        </section>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import { FREE_BRIEF_EDIT_LIMIT } from '@/lib/gtm/types';

const confidenceLabel = {
  website: ['From website', '来自官网'],
  inferred: ['Inferred by NowBuild', '根据公开信息推断'],
  confirmed: ['User correction / AI adjusted', '已按你的补充调整'],
} as const;

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-zinc-400">
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function LaunchBriefPage() {
  const { store } = useGtm();
  const isZh = useLocale() !== 'en';
  const { setViewContext, clearViewContext } = useViewContext();
  const brief = store.launch?.brief;
  const used = store.launch?.briefEditUsed ?? 0;
  const remaining = Math.max(0, FREE_BRIEF_EDIT_LIMIT - used);
  const paid = store.paid;

  useEffect(() => {
    if (!store.launch || !brief) return;
    setViewContext({
      view: 'launch_brief',
      entityType: 'launch_brief',
      entityId: store.launch.project.id,
      title: 'Launch Brief',
      revision: brief.revision,
    });
    return clearViewContext;
  }, [brief, clearViewContext, setViewContext, store.launch]);

  if (!store.launch || !brief) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/app" className="text-sm text-zinc-400 hover:text-white">
          {isZh ? '先建立你的冷启动 →' : 'Build your launch first →'}
        </Link>
      </div>
    );
  }

  const openTeamPaywall = () => {
    window.dispatchEvent(new Event('nowbuild:open-paywall'));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            Campaign Foundation · v{brief.revision}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black tracking-tight text-white">
            Launch Brief
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {isZh
              ? '这是全团队后续工作的事实基础。确认无误后，再开启完整的 30 天执行团队。'
              : 'The free-stage fact base. Correct it, then unlock the full 30-day execution team.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!paid && (
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400">
              {remaining > 0
                ? isZh
                  ? `已免费修改 ${used}/${FREE_BRIEF_EDIT_LIMIT} 次 · 还可修改 ${remaining} 次`
                  : `Free edits ${used}/${FREE_BRIEF_EDIT_LIMIT} · ${remaining} left`
                : isZh
                  ? '免费修改次数已用完 · 简报仍可随时查看'
                  : 'Free edits used up · Brief stays readable'}
            </span>
          )}
          {paid ? (
            <>
              <Link
                href="/app/launch-kit"
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white hover:text-black"
              >
                {isZh ? '检查目录发布资料' : 'Review directory submission materials'}
              </Link>
              <Link
                href="/app/blueprint"
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"
              >
                Campaign Blueprint →
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={openTeamPaywall}
              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"
            >
              {isZh ? '组建我的 30 天推广团队 →' : 'Assemble my 30-day Agent Team →'}
            </button>
          )}
        </div>
      </header>

      {!paid && (
        <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-400/[0.06] px-5 py-4 text-sm leading-6 text-zinc-300">
          {isZh
            ? '如果简报有误，直接在右侧告诉市场合伙人；只有修改成功写入后才会计次。此步骤不会重新抓取网站或搜索竞品。确认无误后，点击上方按钮开启完整的 30 天计划。'
            : 'The Agent on the right can patch this Brief from your corrections (successful write-backs only count). It will not re-crawl the site or re-search competitors. When ready, use the button above to unlock the full campaign.'}
        </div>
      )}

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">01 · Product</p>
          <h2 className="mt-3 text-xl font-bold text-white">{store.launch.project.productName}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{brief.product.summary}</p>
          <div className="mt-5 rounded-2xl bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              {isZh ? '核心问题' : 'Core problem'}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{brief.product.problem}</p>
          </div>
          <List items={brief.product.features} />
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <span className="block text-zinc-600">{isZh ? '阶段' : 'Stage'}</span>
              <span className="mt-1 block text-zinc-300">{brief.product.stage}</span>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <span className="block text-zinc-600">{isZh ? '定价' : 'Pricing'}</span>
              <span className="mt-1 line-clamp-3 block text-zinc-300">{brief.product.pricing}</span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">02 · Target Audience</p>
          <h2 className="mt-3 text-xl font-bold leading-7 text-white">{brief.audience.primary}</h2>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            <span className="font-semibold text-zinc-200">
              {isZh ? '当前替代方式：' : 'Current alternative: '}
            </span>
            {brief.audience.currentAlternative}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                {isZh ? '使用场景' : 'Scenarios'}
              </p>
              <List items={brief.audience.scenarios} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                {isZh ? '尝试动机' : 'Motivations'}
              </p>
              <List items={brief.audience.motivations} />
            </div>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">03 · Competitors & Alternatives</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {brief.competitors.length ? (
            brief.competitors.map((competitor) => (
              <div key={competitor.name} className="rounded-2xl bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">{competitor.name}</h3>
                  {competitor.url && (
                    <a
                      href={competitor.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-zinc-600 hover:text-white"
                    >
                      Source ↗
                    </a>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-400">{competitor.positioning}</p>
                <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-5 text-zinc-600">
                  {competitor.difference}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">
              {isZh
                ? '目前对竞品的判断把握不高。你可以在右侧补充正确的竞品，我会据此更新简报。'
                : 'Competitor confidence is low. Tell the Agent the correct competitors and it will update the Brief from your correction.'}
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-brand-400/20 bg-brand-400/[0.035] p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brand-300/70">04 · Recommended Positioning</p>
        <blockquote className="mt-4 max-w-3xl text-2xl font-bold leading-9 text-white">
          “{brief.positioning.statement}”
        </blockquote>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              {isZh ? '最值得强调的价值' : 'Selling points'}
            </p>
            <List items={brief.positioning.sellingPoints} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              {isZh ? '用户最在意的问题' : 'Pain points'}
            </p>
            <List items={brief.positioning.painPoints} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              {isZh ? '不建议优先强调' : 'Do not lead with'}
            </p>
            <List items={brief.positioning.nonGoals} />
          </div>
        </div>
        <p className="mt-6 border-t border-white/[0.08] pt-5 text-sm leading-6 text-zinc-400">
          <span className="font-semibold text-zinc-200">Voice · </span>
          {brief.positioning.voice}
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-white/[0.08] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Research Confidence</p>
            <p className="mt-2 text-sm text-zinc-400">
              {isZh
                ? '这些标记用来帮助你发现可能的误解，无需逐项审批。'
                : 'These labels reveal assumptions; there is nothing to approve one by one.'}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs capitalize ${
              store.launch.researchConfidence === 'low'
                ? 'bg-amber-300/10 text-amber-200'
                : 'bg-emerald-400/10 text-emerald-300'
            }`}
          >
            {store.launch.researchConfidence}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {brief.evidence.map((item) => (
            <span
              key={item.label}
              className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400"
            >
              {item.label} ·{' '}
              <strong className="font-medium text-zinc-200">
                {confidenceLabel[item.confidence][isZh ? 1 : 0]}
              </strong>
            </span>
          ))}
        </div>
      </section>

      {!paid && (
        <div className="mt-8 flex justify-center border-t border-white/[0.08] pt-8">
          <button
            type="button"
            onClick={openTeamPaywall}
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black hover:bg-zinc-200"
          >
            {isZh ? '组建我的 30 天推广团队 →' : 'Assemble my 30-day Agent Team →'}
          </button>
        </div>
      )}
    </div>
  );
}

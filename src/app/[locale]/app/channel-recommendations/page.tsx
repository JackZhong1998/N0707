'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import ChannelLogo from '@/components/ChannelLogo';
import type {
  ChannelRecommendationPriority,
  ChannelRecommendationResponse,
} from '@/lib/gtm/types';

const PRIORITY_ORDER: ChannelRecommendationPriority[] = [
  'primary',
  'secondary',
  'explore',
  'skip',
];

const PRIORITY_LABEL: Record<ChannelRecommendationPriority, [string, string]> = {
  primary: ['主攻渠道', 'Primary'],
  secondary: ['次要渠道', 'Secondary'],
  explore: ['可探索', 'Explore'],
  skip: ['暂缓', 'Skip'],
};

const PRIORITY_STYLE: Record<ChannelRecommendationPriority, string> = {
  primary: 'border-brand-400/30 bg-brand-400/[0.06]',
  secondary: 'border-white/[0.1] bg-white/[0.04]',
  explore: 'border-white/[0.08] bg-white/[0.025]',
  skip: 'border-white/[0.05] bg-white/[0.015] opacity-60',
};

export default function ChannelRecommendationsPage() {
  const gtm = useGtm();
  const isZh = useLocale() !== 'en';
  const { setViewContext, clearViewContext } = useViewContext();
  const recommendations = gtm.store.launch?.channelRecommendations;
  const selected = gtm.store.launch?.selectedChannelIds ?? gtm.store.channels;
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));

  useEffect(() => {
    setPicked(new Set(selected));
  }, [selected.join(',')]);

  useEffect(() => {
    if (!gtm.store.launch) return;
    setViewContext({
      view: 'channel_recommendations',
      entityType: 'channel_recommendations',
      entityId: gtm.store.launch.project.id,
      title: isZh ? '渠道推荐' : 'Channel Recommendations',
      revision: recommendations?.updatedAt ?? 0,
    });
    return clearViewContext;
  }, [
    clearViewContext,
    gtm.store.launch,
    isZh,
    recommendations?.updatedAt,
    setViewContext,
  ]);

  const grouped = useMemo(() => {
    if (!recommendations) {
      return new Map<
        ChannelRecommendationPriority,
        ChannelRecommendationResponse['recommendations']
      >();
    }
    const map = new Map<
      ChannelRecommendationPriority,
      ChannelRecommendationResponse['recommendations']
    >();
    for (const priority of PRIORITY_ORDER) {
      map.set(
        priority,
        recommendations.recommendations.filter((item) => item.priority === priority)
      );
    }
    return map;
  }, [recommendations]);

  const toggle = (channelId: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  const saveSelection = () => {
    gtm.setSelectedChannelIds([...picked]);
  };

  if (!gtm.store.launch) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/app" className="text-sm text-zinc-400 hover:text-white">
          {isZh ? '先建立冷启动 →' : 'Build your launch first →'}
        </Link>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
          {isZh ? '渠道推荐' : 'Channel Recommendations'}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">
          {isZh ? '还没有渠道推荐' : 'No recommendations yet'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {isZh
            ? '在右侧完成用户档案卡片后，合伙人会调用渠道推荐 Agent。结果也会出现在「文档」区。Directory 是固定能力，不会出现在推荐列表。'
            : 'After the profile card, Partner will run the Channel Recommender. Results also appear under Documents. Directory is always on and never listed here.'}
        </p>
        <Link
          href="/app/documents?doc=recommendations"
          className="mt-6 inline-block text-xs font-semibold text-zinc-400 hover:text-white"
        >
          ← {isZh ? '文档' : 'Documents'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
      <header className="border-b border-white/[0.08] pb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
          {isZh ? '渠道推荐' : 'Channel Recommendations'}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black tracking-tight text-white">
          {isZh ? '这个产品，应该先做哪些渠道？' : 'Which channels should you run first?'}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1">
            {recommendations.diagnosis.productType}
          </span>
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1">
            {recommendations.diagnosis.primaryMarket}
          </span>
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1">
            {recommendations.diagnosis.growthStage}
          </span>
        </div>
      </header>

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6">
        <div className="prose prose-invert max-w-none text-sm leading-7 text-zinc-300">
          {recommendations.summaryMarkdown.split('\n').map((line, index) =>
            line.startsWith('##') ? (
              <h2 key={index} className="mt-4 text-base font-bold text-white">
                {line.replace(/^#+\s*/, '')}
              </h2>
            ) : line.startsWith('#') ? (
              <h3 key={index} className="mt-3 text-sm font-semibold text-white">
                {line.replace(/^#+\s*/, '')}
              </h3>
            ) : line.trim() ? (
              <p key={index} className="mt-2 text-zinc-400">
                {line}
              </p>
            ) : null
          )}
        </div>
      </section>

      {PRIORITY_ORDER.map((priority) => {
        const items = grouped.get(priority) ?? [];
        if (items.length === 0) return null;
        const [labelZh, labelEn] = PRIORITY_LABEL[priority];
        return (
          <section key={priority} className="mt-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              {isZh ? labelZh : labelEn}
            </h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {items.map((item) => {
                const checked = picked.has(item.channelId);
                const selectable = priority !== 'skip';
                return (
                  <label
                    key={item.channelId}
                    className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${PRIORITY_STYLE[priority]} ${
                      checked ? 'ring-1 ring-brand-400/40' : ''
                    } ${!selectable ? 'cursor-default' : ''}`}
                  >
                    {selectable ? (
                      <input
                        type="checkbox"
                        className="mt-1 accent-brand-400"
                        checked={checked}
                        onChange={() => toggle(item.channelId)}
                      />
                    ) : (
                      <span className="mt-1 h-4 w-4 shrink-0" />
                    )}
                    <span className="flex min-w-0 flex-1 gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                        <ChannelLogo channelId={item.channelId} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-white">
                            {item.channelName}
                          </strong>
                          <span className="text-[10px] text-zinc-500">
                            fit {item.fitScore}
                          </span>
                          <span className="text-[10px] uppercase text-zinc-600">
                            {item.effortLevel}
                          </span>
                        </span>
                        <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                          {item.rationale}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-600">
                          {item.marketFit} · {item.suggestedCadence}
                        </p>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6">
        <p className="text-xs text-zinc-500">
          {isZh
            ? `已选 ${picked.size} 个渠道。确认后告诉合伙人「按这些渠道写计划」。`
            : `${picked.size} channels selected. Tell the partner to write plans for them.`}
        </p>
        <button
          type="button"
          onClick={saveSelection}
          disabled={picked.size === 0}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {isZh ? '确认渠道选择' : 'Confirm selection'}
        </button>
      </footer>
    </div>
  );
}

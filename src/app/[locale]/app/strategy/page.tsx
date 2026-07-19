'use client';

/**
 * 市场策略文档页
 * - 总体 30 天冷启动策略
 * - 按渠道罗列策略 Agent 输出的方向性文档
 * - 支持对单个渠道提出反馈 → 策略 Agent 重新生成该渠道策略
 */

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';
import { Markdown } from '@/lib/gtm/markdown';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import ChannelLogo from '@/components/ChannelLogo';

export default function StrategyPage() {
  const { store } = useGtm();
  const { setViewContext, clearViewContext } = useViewContext();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const channelDocs = Object.values(store.channelStrategies);

  useEffect(() => {
    setViewContext({
      view: 'market_strategy',
      entityType: 'strategy',
      title: isZh ? '30 天冷启动市场策略' : '30-day market strategy',
      revision: store.strategy?.updatedAt,
    });
    return clearViewContext;
  }, [
    clearViewContext,
    isZh,
    setViewContext,
    store.strategy?.updatedAt,
  ]);

  if (!store.strategy && channelDocs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="index-label">{isZh ? '市场策略' : 'Strategy'}</p>
        <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
          {isZh
            ? '策略还没生成。先和市场总监聊聊你的产品，它会安排策略 Agent 为你产出 30 天冷启动策略。'
            : 'No strategy yet. Talk to your director first — it will have the strategist draft your 30-day plan.'}
        </p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new Event('nowbuild:open-agent'))
          }
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          {isZh ? '去对话 →' : 'Start talking →'}
        </button>
      </div>
    );
  }

  const shown = activeChannel
    ? channelDocs.filter((d) => d.channelId === activeChannel)
    : channelDocs;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <p className="index-label">{isZh ? '市场策略文档' : 'Strategy documents'}</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {isZh ? '30 天冷启动市场策略' : 'Your 30-day cold-start strategy'}
      </h1>
      {store.strategy?.goal && (
        <p className="mt-2 text-sm text-zinc-500">
          {isZh ? '目标：' : 'Goal: '}
          {store.strategy.goal}
        </p>
      )}

      {/* 总体策略 */}
      {store.strategy && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-hairline">
          <div className="bg-paper-dim px-5 py-3">
            <span className="index-label">{isZh ? '总体策略' : 'Overview'}</span>
          </div>
          <div className="px-5 py-5">
            <Markdown text={store.strategy.overviewMarkdown} />
          </div>
        </section>
      )}

      {/* 渠道筛选 */}
      {channelDocs.length > 1 && (
        <div className="mt-10 flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setActiveChannel(null);
              setViewContext({
                view: 'market_strategy',
                entityType: 'strategy',
                title: isZh ? '总体市场策略' : 'Overall market strategy',
                revision: store.strategy?.updatedAt,
              });
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeChannel === null ? 'bg-ink text-white' : 'border border-hairline text-ink-muted hover:text-ink'
            }`}
          >
            {isZh ? '全部渠道' : 'All channels'}
          </button>
          {channelDocs.map((d) => (
            <button
              key={d.channelId}
              onClick={() => {
                setActiveChannel(d.channelId);
                setViewContext({
                  view: 'channel_strategy',
                  entityType: 'channel_strategy',
                  entityId: d.channelId,
                  channelId: d.channelId,
                  title: `${d.channelName} · ${isZh ? '渠道策略' : 'channel strategy'}`,
                  revision: d.updatedAt,
                });
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeChannel === d.channelId
                  ? 'bg-ink text-white'
                  : 'border border-hairline text-ink-muted hover:text-ink'
              }`}
            >
              <ChannelLogo channelId={d.channelId} size={14} />
              {d.channelName}
            </button>
          ))}
        </div>
      )}

      {/* 各渠道方向性文档 */}
      <div className="mt-6 space-y-8 pb-16">
        {shown.map((doc) => (
          <section key={doc.channelId} className="overflow-hidden rounded-2xl border border-hairline">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-paper-dim px-5 py-3">
              <div className="flex items-center gap-2">
                <ChannelLogo channelId={doc.channelId} size={18} />
                <span className="text-sm font-semibold text-ink">{doc.channelName}</span>
                <span className="index-label ml-1">{doc.channelId}</span>
              </div>
              <button
                onClick={() => {
                  setViewContext({
                    view: 'channel_strategy',
                    entityType: 'channel_strategy',
                    entityId: doc.channelId,
                    channelId: doc.channelId,
                    title: `${doc.channelName} · ${isZh ? '渠道策略' : 'channel strategy'}`,
                    revision: doc.updatedAt,
                  });
                  window.dispatchEvent(new Event('nowbuild:open-agent'));
                }}
                className="rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink disabled:opacity-40"
              >
                {isZh ? '在右侧讨论' : 'Discuss on the right'}
              </button>
            </div>

            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <div className="rounded-xl bg-paper-dim p-4">
                <p className="index-label">{isZh ? '账号定位' : 'Positioning'}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink">{doc.positioning}</p>
              </div>
              <div className="rounded-xl bg-paper-dim p-4">
                <p className="index-label">{isZh ? '内容支柱' : 'Content pillars'}</p>
                <ul className="mt-2 space-y-1">
                  {doc.contentPillars.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-ink">
                      <span className="mt-2 h-1 w-1 shrink-0 bg-ink" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="px-5 pb-5 pt-2">
              <Markdown text={doc.markdown} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

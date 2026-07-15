'use client';

/**
 * 市场策略文档页
 * - 总体 30 天冷启动策略
 * - 按渠道罗列策略 Agent 输出的方向性文档
 * - 支持对单个渠道提出反馈 → 策略 Agent 重新生成该渠道策略
 */

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { callStrategist } from '@/lib/gtm/api-client';
import { Markdown } from '@/lib/gtm/markdown';

export default function StrategyPage() {
  const gtm = useGtm();
  const { store, hydrated } = gtm;
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="index-label animate-pulse-soft">Loading…</span>
      </div>
    );
  }

  const channelDocs = Object.values(store.channelStrategies);

  if (!store.strategy && channelDocs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="index-label">{isZh ? '市场策略' : 'Strategy'}</p>
        <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
          {isZh
            ? '策略还没生成。先和市场总监聊聊你的产品，它会安排策略 Agent 为你产出 30 天冷启动策略。'
            : 'No strategy yet. Talk to your director first — it will have the strategist draft your 30-day plan.'}
        </p>
        <Link
          href="/app/chat"
          className="bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          {isZh ? '去对话 →' : 'Start talking →'}
        </Link>
      </div>
    );
  }

  const submitFeedback = async (channelId: string) => {
    const text = feedback.trim();
    if (!text || regenerating) return;
    setRegenerating(channelId);
    setFeedbackFor(null);
    setFeedback('');
    try {
      const res = await callStrategist({
        channelIds: [channelId],
        store,
        feedback: text,
        locale,
      });
      for (const c of res.channels) {
        gtm.upsertChannelStrategy({
          channelId: c.channelId,
          channelName: c.channelName,
          positioning: c.positioning,
          direction: c.direction,
          contentPillars: c.contentPillars,
          markdown: c.markdown,
          updatedAt: Date.now(),
        });
      }
    } catch {
      // 重新生成失败保留原文档
    } finally {
      setRegenerating(null);
    }
  };

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
        <section className="mt-8 border border-hairline">
          <div className="border-b border-hairline bg-paper-dim px-5 py-3">
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
            onClick={() => setActiveChannel(null)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeChannel === null ? 'bg-ink text-white' : 'border border-hairline text-ink-muted hover:text-ink'
            }`}
          >
            {isZh ? '全部渠道' : 'All channels'}
          </button>
          {channelDocs.map((d) => (
            <button
              key={d.channelId}
              onClick={() => setActiveChannel(d.channelId)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeChannel === d.channelId
                  ? 'bg-ink text-white'
                  : 'border border-hairline text-ink-muted hover:text-ink'
              }`}
            >
              {d.channelName}
            </button>
          ))}
        </div>
      )}

      {/* 各渠道方向性文档 */}
      <div className="mt-6 space-y-8 pb-16">
        {shown.map((doc) => (
          <section key={doc.channelId} className="border border-hairline">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-paper-dim px-5 py-3">
              <div>
                <span className="text-sm font-semibold text-ink">{doc.channelName}</span>
                <span className="index-label ml-3">{doc.channelId}</span>
              </div>
              <button
                onClick={() => {
                  setFeedbackFor(feedbackFor === doc.channelId ? null : doc.channelId);
                  setFeedback('');
                }}
                disabled={regenerating !== null}
                className="border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink disabled:opacity-40"
              >
                {isZh ? '提意见修改' : 'Give feedback'}
              </button>
            </div>

            {regenerating === doc.channelId ? (
              <div className="flex items-center gap-3 px-5 py-10">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ink" />
                </span>
                <p className="text-sm text-zinc-400">
                  {isZh ? '策略 Agent 正在根据你的意见重写…' : 'Strategist is rewriting based on your feedback…'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-px bg-hairline sm:grid-cols-2">
                  <div className="bg-white p-5">
                    <p className="index-label">{isZh ? '账号定位' : 'Positioning'}</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink">{doc.positioning}</p>
                  </div>
                  <div className="bg-white p-5">
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
                <div className="border-t border-hairline px-5 py-5">
                  <Markdown text={doc.markdown} />
                </div>
              </>
            )}

            {feedbackFor === doc.channelId && regenerating === null && (
              <div className="border-t border-hairline bg-paper-dim p-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder={
                    isZh
                      ? '例如：我是从产品经理转型的独立开发者，希望内容更多结合我的转型经历…'
                      : 'e.g. I moved from PM to indie dev — lean the content on that story…'
                  }
                  className="w-full resize-none border border-hairline bg-white px-3.5 py-3 text-sm leading-relaxed outline-none focus:border-ink"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setFeedbackFor(null)}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-ink"
                  >
                    {isZh ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => void submitFeedback(doc.channelId)}
                    disabled={!feedback.trim()}
                    className="bg-ink px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200"
                  >
                    {isZh ? '提交并重新生成' : 'Submit & regenerate'}
                  </button>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

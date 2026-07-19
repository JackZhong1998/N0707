'use client';

import { use, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { Markdown } from '@/lib/gtm/markdown';
import { useViewContext } from '@/lib/gtm/view-context-provider';

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function ArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const locale = useLocale();
  const isZh = locale !== 'en';
  const gtm = useGtm();
  const { setViewContext, clearViewContext } = useViewContext();
  const artifact = gtm.store.artifacts.find((item) => item.id === id);

  useEffect(() => {
    if (!artifact) return;
    setViewContext({
      view: 'agent_artifact',
      entityType: 'artifact',
      entityId: artifact.id,
      title: artifact.title,
      revision: artifact.version,
    });
    return clearViewContext;
  }, [artifact, clearViewContext, setViewContext]);

  if (!artifact) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#0a0b0d] p-6 text-zinc-300">
        <div className="text-center">
          <p className="text-sm font-medium">
            {isZh ? '这份内容不存在或尚未同步。' : 'This artifact is unavailable.'}
          </p>
          <Link
            href="/app/calendar"
            className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:text-white"
          >
            {isZh ? '返回工作台' : 'Back to workspace'}
          </Link>
        </div>
      </div>
    );
  }

  const sources = (
    Array.isArray(artifact.metadata?.sources)
      ? artifact.metadata.sources
      : []
  ).flatMap((source) => {
    if (!source || typeof source !== 'object') return [];
    const item = source as Record<string, unknown>;
    const url = safeSourceUrl(item.url);
    if (!url) return [];
    return [
      {
        url,
        title:
          typeof item.title === 'string'
            ? item.title.slice(0, 500)
            : url,
      },
    ];
  });

  return (
    <div className="min-h-full bg-[#0a0b0d] bg-grid-dark px-4 py-6 text-zinc-100 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/app/calendar"
            className="text-xs text-zinc-500 transition-colors hover:text-white"
          >
            ← {isZh ? '返回执行工作台' : 'Back to workspace'}
          </Link>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                artifact.status === 'waiting_approval'
                  ? 'bg-amber-300'
                  : artifact.status === 'applied'
                    ? 'bg-emerald-400'
                    : 'bg-sky-400'
              }`}
            />
            {artifact.status === 'waiting_approval'
              ? isZh
                ? '等待确认'
                : 'Awaiting approval'
              : artifact.status === 'applied'
                ? isZh
                  ? '已应用'
                  : 'Applied'
                : isZh
                  ? '工作产物'
                  : 'Artifact'}
            <span>· V{artifact.version}</span>
          </div>
        </div>

        <header className="mt-6 rounded-3xl border border-white/[0.09] bg-[#111318]/95 p-6 shadow-2xl sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            {artifact.kind.replaceAll('_', ' ')}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
            {artifact.title}
          </h1>
          {artifact.summary && (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              {artifact.summary}
            </p>
          )}
          <p className="mt-5 text-[10px] text-zinc-600">
            {new Date(artifact.updatedAt).toLocaleString(
              isZh ? 'zh-CN' : 'en-US'
            )}
          </p>
        </header>

        <article className="mt-4 rounded-3xl border border-white/[0.08] bg-[#111318] p-6 sm:p-8">
          <Markdown
            text={artifact.markdown}
            className="doc-prose doc-prose-invert max-w-none !text-zinc-300 [&_a]:text-sky-300 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-zinc-100 [&_strong]:text-white"
          />
        </article>

        {sources.length > 0 && (
          <section className="mt-4 rounded-3xl border border-white/[0.08] bg-[#111318] p-6">
            <h2 className="text-sm font-semibold text-white">
              {isZh ? '研究来源' : 'Research sources'}
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sources.slice(0, 24).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                >
                  {source.title || source.url}
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-400/[0.05] px-4 py-3 text-xs leading-5 text-sky-100/70">
          {isZh
            ? '右侧市场合伙人已经知道你正在查看这份内容。你可以直接说“第三条结论不对”或“按这份方案调整下周选题”。'
            : 'Your marketing partner knows this artifact is open. You can refer directly to a conclusion or ask for the next plan to be adjusted.'}
        </div>

        {artifact.status === 'waiting_approval' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
            <div>
              <p className="text-sm font-medium text-amber-100">
                {isZh ? '这份调整还没有应用' : 'These changes are not applied yet'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {isZh
                  ? '先在右侧确认；只有你明确同意后，Agent 才会修改未来计划。'
                  : 'Confirm on the right. The Agent changes future plans only after your explicit approval.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  gtm.updateArtifact(artifact.id, { status: 'archived' })
                }
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                {isZh ? '暂不采用' : 'Not now'}
              </button>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('nowbuild:open-agent', {
                      detail: {
                        prefill: isZh
                          ? '请先概括这份复盘建议将修改哪些未来计划；确认无误后，我要应用这些调整。'
                          : 'Summarize which future plans this review would change. After I confirm, I want to apply those adjustments.',
                      },
                    })
                  )
                }
                className="rounded-full bg-amber-200 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-100"
              >
                {isZh ? '去右侧确认调整' : 'Confirm on the right'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

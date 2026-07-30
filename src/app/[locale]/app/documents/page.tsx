'use client';

/**
 * 文档列表页：点击进入详情页。
 */

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import ChannelLogo from '@/components/ChannelLogo';
import { buildDocumentList } from '@/components/app/DocumentsWorkspace';

export default function DocumentsPage() {
  const { store } = useGtm();
  const isZh = useLocale() !== 'en';
  const { setViewContext, clearViewContext } = useViewContext();
  const docs = useMemo(() => buildDocumentList(store, isZh), [store, isZh]);
  const paid = store.paid;

  useEffect(() => {
    setViewContext({
      view: 'documents',
      entityType: 'document_collection',
      title: isZh ? '文档' : 'Documents',
    });
    return clearViewContext;
  }, [clearViewContext, isZh, setViewContext]);

  if (!store.launch) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/app" className="text-sm text-zinc-400 hover:text-white">
          {isZh ? '先建立冷启动 →' : 'Build your launch first →'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-8 sm:py-10">
      <header className="border-b border-white/[0.08] pb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
          {isZh ? '文档' : 'Documents'}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          {isZh ? '工作文档' : 'Workspace docs'}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isZh
            ? '点击任意文档查看详情。项目文档、用户档案、渠道推荐与各渠道策略都在这里。'
            : 'Open any document for details. Project doc, profile, recommendations, and channel strategies live here.'}
        </p>
      </header>

      {!paid && store.launch.brief && (
        <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-400/[0.06] px-5 py-4 text-sm leading-6 text-zinc-300">
          {isZh
            ? '项目文档可免费查看与纠正。确认无误后，在项目文档详情页组建 30 天推广团队。'
            : 'The project document is free to review and correct. When ready, assemble the 30-day team from its detail page.'}
        </div>
      )}

      <ul className="mt-7 space-y-2">
        {docs.map((doc) => (
          <li key={doc.id}>
            <Link
              href={`/app/documents/${encodeURIComponent(doc.id)}`}
              className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4 transition hover:border-white/20 hover:bg-white/[0.045]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                {doc.channelId ? (
                  <ChannelLogo channelId={doc.channelId} size={18} />
                ) : (
                  <span className="text-[11px] font-bold text-zinc-400">
                    {doc.kind === 'project'
                      ? 'P'
                      : doc.kind === 'user'
                        ? 'U'
                        : 'R'}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{doc.label}</span>
                  {!doc.ready ? (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">
                      {isZh ? '待生成' : 'Pending'}
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-400/20 px-2 py-0.5 text-[10px] text-emerald-300/80">
                      {isZh ? '已生成' : 'Ready'}
                    </span>
                  )}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-zinc-500">
                  {doc.summary}
                </span>
              </span>
              <span className="mt-1 text-zinc-600" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-baseline gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
          {isZh ? '工作文档' : 'Workspace docs'}
        </h1>
        <span className="hidden text-xs text-zinc-500 sm:inline">
          {isZh
            ? '项目文档、用户档案、渠道推荐、渠道策略与研究报告'
            : 'Project docs, profiles, recommendations, strategies & reports'}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
        <ul className="mx-auto max-w-3xl space-y-2 pb-16">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link
                href={doc.href}
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
                          : doc.kind === 'recommendations'
                            ? 'R'
                            : doc.kind === 'artifact'
                              ? 'A'
                              : 'D'}
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
                    {doc.version ? (
                      <span className="text-[10px] text-zinc-600">v{doc.version}</span>
                    ) : null}
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
    </div>
  );
}

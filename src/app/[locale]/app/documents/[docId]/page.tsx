'use client';

/**
 * 文档详情页：从列表点击进入。
 */

import { use, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { storePatchForNewLaunch } from '@/lib/gtm/launch';
import {
  resetFreeLaunchResearch,
  runFreeLaunchResearch,
} from '@/lib/gtm/free-launch-research';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import type { LaunchBrief } from '@/lib/gtm/types';
import {
  buildDocumentList,
  DocumentDetailBody,
  isValidDocId,
  type DocId,
} from '@/components/app/DocumentsWorkspace';

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId: rawParam } = use(params);
  const gtm = useGtm();
  const { store } = gtm;
  const locale = useLocale();
  const isZh = locale !== 'en';
  const router = useRouter();
  const { setViewContext, clearViewContext } = useViewContext();
  const [retrying, setRetrying] = useState(false);
  const docs = useMemo(() => buildDocumentList(store, isZh), [store, isZh]);
  const rawId = decodeURIComponent(rawParam);
  const docId: DocId = isValidDocId(rawId, docs) ? rawId : 'project';
  const doc = docs.find((item) => item.id === docId) ?? docs[0];
  const paid = store.paid;
  const brief = store.launch?.brief;
  const recommendations = store.launch?.channelRecommendations;
  const lastBriefRevision = store.launch?.revisions
    .slice()
    .reverse()
    .find((item) => item.entityType === 'brief');
  const canUndoBrief =
    docId === 'project' &&
    store.launch?.revisions.at(-1)?.entityType === 'brief';

  const unknown = isZh ? '官网未说明' : 'Not stated on the website';
  const looksLikeFailedResearch =
    docId === 'project' &&
    !paid &&
    store.launch?.researchConfidence === 'low' &&
    Boolean(brief) &&
    (brief!.product.summary === unknown || brief!.product.problem === unknown) &&
    (brief!.competitors?.length ?? 0) === 0;

  const versionLabel = useMemo(() => {
    if (docId === 'project' && brief) return brief.revision;
    return undefined;
  }, [brief, docId]);

  useEffect(() => {
    if (!store.launch) return;

    if (docId === 'project' && brief) {
      setViewContext({
        view: 'document_detail',
        entityType: 'launch_brief',
        entityId: store.launch.project.id,
        title: doc?.label,
        section: 'project',
        revision: brief.revision,
      });
      return clearViewContext;
    }

    if (docId === 'recommendations') {
      setViewContext({
        view: 'document_detail',
        entityType: 'channel_recommendations',
        entityId: store.launch.project.id,
        title: doc?.label,
        section: 'recommendations',
        revision: recommendations?.updatedAt ?? 0,
      });
      return clearViewContext;
    }

    if (docId.startsWith('channel-')) {
      const channelId = docId.replace('channel-', '');
      setViewContext({
        view: 'document_detail',
        entityType: 'channel_strategy',
        entityId: channelId,
        channelId,
        title: doc?.label,
        section: docId,
        revision: store.channelStrategies[channelId]?.updatedAt,
      });
      return clearViewContext;
    }

    setViewContext({
      view: 'document_detail',
      entityType: 'user_profile',
      entityId: 'user',
      title: doc?.label,
      section: 'user',
    });
    return clearViewContext;
  }, [
    brief,
    clearViewContext,
    doc?.label,
    docId,
    recommendations?.updatedAt,
    setViewContext,
    store.channelStrategies,
    store.launch,
  ]);

  if (!store.launch) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/app" className="text-sm text-zinc-400 hover:text-white">
          {isZh ? '先建立冷启动 →' : 'Build your launch first →'}
        </Link>
      </div>
    );
  }

  const openTeamPaywall = () => {
    window.dispatchEvent(new Event('nowbuild:open-paywall'));
  };

  const handleRetryResearch = async () => {
    if (retrying || !store.launch) return;
    setRetrying(true);
    const next = resetFreeLaunchResearch(store.launch, isZh);
    gtm.update(storePatchForNewLaunch(next));
    router.replace('/app');
    try {
      await runFreeLaunchResearch({ launch: next, locale, isZh, gtm });
      router.replace('/app/documents/project');
    } catch (error) {
      console.error('Document research retry failed:', error);
      router.replace('/app');
    } finally {
      setRetrying(false);
    }
  };

  const undoBriefRevision = () => {
    const launch = store.launch;
    const revision = launch?.revisions.at(-1);
    if (!launch || !revision || revision.entityType !== 'brief') return;
    gtm.update({
      launch: {
        ...launch,
        brief: revision.snapshot as LaunchBrief,
        revisions: launch.revisions.slice(0, -1),
        lastUndoLabel: undefined,
        project: { ...launch.project, updatedAt: Date.now() },
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 pb-24 sm:px-8 sm:py-10 sm:pb-28">
      <Link
        href="/app/documents"
        className="text-xs text-zinc-600 transition hover:text-white"
      >
        ← {isZh ? '文档列表' : 'All documents'}
      </Link>

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            {docId === 'project' && versionLabel
              ? `Campaign Foundation · v${versionLabel}`
              : isZh
                ? '文档详情'
                : 'Document'}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
            {doc?.label}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{doc?.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canUndoBrief ? (
            <button
              type="button"
              onClick={undoBriefRevision}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.06]"
              title={lastBriefRevision?.label}
            >
              {isZh ? '撤销上次修改' : 'Undo last change'}
            </button>
          ) : null}
          {docId === 'project' && !paid && brief ? (
            <button
              type="button"
              onClick={openTeamPaywall}
              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"
            >
              {isZh ? '组建我的 30 天推广团队 →' : 'Assemble my 30-day Agent Team →'}
            </button>
          ) : null}
        </div>
      </header>

      {looksLikeFailedResearch ? (
        <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/[0.08] px-5 py-4">
          <p className="text-sm leading-6 text-red-100">
            {isZh
              ? '这次分析很可能因网络失败中断。请重新分析后再继续。'
              : 'This analysis likely failed due to a network error. Retry before continuing.'}
          </p>
          <button
            type="button"
            onClick={() => void handleRetryResearch()}
            disabled={retrying}
            className="mt-3 rounded-full bg-white px-5 py-2 text-xs font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {retrying
              ? isZh
                ? '正在重试…'
                : 'Retrying…'
              : isZh
                ? '重新分析'
                : 'Retry analysis'}
          </button>
        </div>
      ) : null}

      {docId === 'project' && !paid && brief ? (
        <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-400/[0.06] px-5 py-4 text-sm leading-6 text-zinc-300">
          {isZh
            ? '如果文档有误，直接在右侧告诉冷启动合伙人。需要撤回时点上方「撤销上次修改」，或直接说「撤销」。'
            : 'Tell Launch Partner on the right to correct this document. Use “Undo last change” above, or say “undo”.'}
        </div>
      ) : null}

      <article className="mt-6 min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-7">
        <DocumentDetailBody docId={docId} store={store} isZh={isZh} />
      </article>
    </div>
  );
}

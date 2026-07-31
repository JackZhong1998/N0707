'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import { detectPublisherExtension } from '@/lib/gtm/publisher-extension';
import {
  isSyncableTodo,
  syncAllPostMetrics,
  type SyncProgress,
} from '@/lib/gtm/sync-all-metrics';
import {
  engagementRate,
  formatMetric,
  latestMetricSnapshot,
  primaryReach,
  totalEngagement,
} from '@/lib/gtm/post-metrics';

type Filter = 'all' | string;

export default function PostsPage() {
  const { store, hydrated, updateTodo } = useGtm();
  const { setViewContext, clearViewContext } = useViewContext();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [filter, setFilter] = useState<Filter>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    setViewContext({
      view: 'post_metrics',
      entityType: 'post_collection',
      title: isZh ? '帖子与数据' : 'Posts & metrics',
    });
    return clearViewContext;
  }, [clearViewContext, isZh, setViewContext]);

  const published = useMemo(
    () =>
      store.todos
        .filter((todo) => todo.publishedUrl)
        .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)),
    [store.todos]
  );
  const visible =
    filter === 'all'
      ? published
      : published.filter((todo) => todo.channelId === filter);
  const channelFilters = useMemo(
    () =>
      [
        ...new Map(
          published.map((todo) => [
            todo.channelId,
            { id: todo.channelId, label: todo.channelName },
          ])
        ).values(),
      ],
    [published]
  );
  const measured = published.filter((todo) => latestMetricSnapshot(todo));
  const totalReach = measured.reduce(
    (sum, todo) => sum + (primaryReach(latestMetricSnapshot(todo)!.metrics) ?? 0),
    0
  );
  const totalInteractions = measured.reduce(
    (sum, todo) => sum + totalEngagement(latestMetricSnapshot(todo)!.metrics),
    0
  );
  const syncableCount = published.filter(isSyncableTodo).length;

  const handleSyncAll = async () => {
    if (syncing || syncableCount === 0) return;
    setSyncing(true);
    setSyncMessage('');
    setSyncProgress({
      current: 0,
      total: syncableCount,
      message: isZh ? '正在后台抓取…' : 'Syncing in background…',
    });

    const publisher = await detectPublisherExtension();
    if (!publisher.installed) {
      setSyncMessage(
        isZh
          ? '请先安装 NowBuild 发布插件，才能自动抓取帖子数据。'
          : 'Install the NowBuild publisher extension to sync post metrics.'
      );
      setSyncProgress(null);
      setSyncing(false);
      return;
    }

    const result = await syncAllPostMetrics(store.todos, updateTodo, {
      force: true,
      onProgress: (next) => setSyncProgress(next),
    });

    if (result.total === 0) {
      setSyncMessage(
        isZh ? '没有可抓取的帖子。' : 'No posts available to sync.'
      );
    } else if (result.failed === 0) {
      setSyncMessage(
        isZh
          ? `已成功抓取 ${result.completed} 条帖子的数据。`
          : `Synced metrics for ${result.completed} posts.`
      );
    } else {
      setSyncMessage(
        isZh
          ? `抓取完成：${result.completed} 条成功，${result.failed} 条失败（可进入详情手动录入）。`
          : `Finished: ${result.completed} synced, ${result.failed} failed (enter details to add manually).`
      );
    }

    setSyncProgress(null);
    setSyncing(false);
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="index-label animate-pulse-soft">
          {isZh ? '正在读取帖子数据…' : 'Loading post data…'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
            {isZh ? '帖子与数据' : 'Posts & metrics'}
          </h1>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            {isZh
              ? '每一条已发布内容，都会成为策略调整的证据'
              : 'Every published post becomes evidence for strategy'}
          </span>
        </div>
          <div className="flex flex-wrap items-center gap-2">
            {syncableCount > 0 && (
              <button
                type="button"
                onClick={() => void handleSyncAll()}
                disabled={syncing}
                className="flex h-8 items-center gap-2 rounded-full bg-white px-3.5 text-[11px] font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                <svg
                  className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                  />
                </svg>
                {syncing
                  ? isZh
                    ? '抓取中…'
                    : 'Syncing…'
                  : isZh
                    ? '一键抓取全部数据'
                    : 'Sync all metrics'}
              </button>
            )}
            <div className="flex rounded-full border border-white/[0.08] bg-white/[0.025] p-1">
              {([
                { id: 'all', label: isZh ? '全部' : 'All' },
                ...channelFilters,
              ] as Array<{ id: Filter; label: string }>).map(
                ({ id: value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setFilter(value);
                    setViewContext({
                      view: 'post_metrics',
                      entityType: 'post_collection',
                      title:
                        value === 'all'
                          ? isZh
                            ? '全部帖子数据'
                            : 'All post metrics'
                          : `${label} · ${isZh ? '帖子数据' : 'post metrics'}`,
                      channelId: value === 'all' ? undefined : value,
                    });
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    filter === value
                      ? 'bg-white text-black'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
                )
              )}
            </div>
          </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-5xl pb-16">
        {(syncProgress || syncMessage) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-xs ${
              syncProgress
                ? 'border-white/20 bg-white/[0.06] text-white'
                : 'border-white/[0.08] bg-white/[0.025] text-zinc-300'
            }`}
          >
            {syncProgress ? (
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {isZh ? '正在抓取：' : 'Syncing: '}
                    {syncProgress.message}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {syncProgress.current} / {syncProgress.total}
                  </p>
                </div>
              </div>
            ) : (
              <p>{syncMessage}</p>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {isZh ? '已发布' : 'Published'}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">{published.length}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {isZh ? '累计曝光/浏览' : 'Total reach'}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">
              {formatMetric(measured.length ? totalReach : undefined)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {isZh ? '累计互动' : 'Interactions'}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">
              {formatMetric(measured.length ? totalInteractions : undefined)}
            </p>
          </div>
        </div>

        <div className="mt-2 space-y-2">
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-6 py-16 text-center">
              <p className="text-sm font-medium text-white">
                {isZh ? '还没有已发布帖子' : 'No published posts yet'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {isZh
                  ? '从 Launch Calendar 发布第一条内容后，它会出现在这里。'
                  : 'Publish your first calendar item and it will appear here.'}
              </p>
              <Link
                href="/app/calendar"
                className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                {isZh ? '打开 Launch Calendar' : 'Open calendar'}
              </Link>
            </div>
          ) : (
            visible.map((todo) => {
              const snapshot = latestMetricSnapshot(todo);
              const metrics = snapshot?.metrics;
              const rate = metrics ? engagementRate(metrics) : undefined;
              return (
                <Link
                  key={todo.id}
                  href={`/app/calendar/task/${todo.id}`}
                  onClick={() =>
                    setViewContext({
                      view: 'post_detail',
                      entityType: 'todo',
                      entityId: todo.id,
                      title: todo.content?.title || todo.title,
                      channelId: todo.channelId,
                      revision:
                        todo.metricSnapshots?.at(-1)?.collectedAt ??
                        todo.publishedAt,
                    })
                  }
                  className="block rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-white/20 hover:bg-white/[0.045]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-zinc-300">
                          {todo.channelName}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {todo.publishedAt
                            ? new Date(todo.publishedAt).toLocaleString(
                                isZh ? 'zh-CN' : 'en-US'
                              )
                            : ''}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-white">
                        {todo.content?.title || todo.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                        {todo.content?.body || todo.brief}
                      </p>
                    </div>
                    {metrics ? (
                      <div className="grid w-full grid-cols-2 gap-4 text-right sm:w-auto sm:grid-cols-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            {isZh ? '曝光' : 'Reach'}
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-white">
                            {formatMetric(primaryReach(metrics))}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            {isZh ? '点赞' : 'Likes'}
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-white">
                            {formatMetric(metrics.likes)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            {isZh ? '收藏' : 'Saves'}
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-white">
                            {formatMetric(metrics.saves)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            {isZh ? '互动率' : 'Rate'}
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-white">
                            {rate === undefined ? '—' : `${(rate * 100).toFixed(1)}%`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-500">
                        {isZh ? '等待首次数据' : 'Awaiting metrics'}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

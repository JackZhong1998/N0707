'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  collectMetricsWithExtension,
  detectPublisherExtension,
  type PublisherAvailability,
  type SupportedPublishChannel,
} from '@/lib/gtm/publisher-extension';
import {
  formatMetric,
  latestMetricSnapshot,
} from '@/lib/gtm/post-metrics';
import type { PostMetricSnapshot, PostMetrics, Todo } from '@/lib/gtm/types';

interface Props {
  todo: Todo;
  onSnapshot: (snapshot: PostMetricSnapshot) => void;
}

const FIELD_LABELS: Record<keyof PostMetrics, { zh: string; en: string }> = {
  impressions: { zh: '展示', en: 'Impressions' },
  views: { zh: '浏览', en: 'Views' },
  likes: { zh: '点赞', en: 'Likes' },
  comments: { zh: '评论', en: 'Comments' },
  shares: { zh: '分享', en: 'Shares' },
  saves: { zh: '收藏', en: 'Saves' },
  clicks: { zh: '点击', en: 'Clicks' },
  followersGained: { zh: '新增粉丝', en: 'Followers' },
};

function metricFields(channelId: string): Array<keyof PostMetrics> {
  return channelId === 'twitter_x'
    ? ['impressions', 'likes', 'comments', 'shares', 'saves']
    : ['views', 'likes', 'saves', 'comments', 'shares'];
}

export default function PostMetricsPanel({ todo, onSnapshot }: Props) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [publisher, setPublisher] = useState<PublisherAvailability | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [message, setMessage] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  const snapshots = useMemo(
    () => [...(todo.metricSnapshots ?? [])].sort((a, b) => b.collectedAt - a.collectedAt),
    [todo.metricSnapshots]
  );
  const latest = latestMetricSnapshot(todo);
  const previous = snapshots[1];
  const fields = metricFields(todo.channelId);

  useEffect(() => {
    let cancelled = false;
    void detectPublisherExtension().then((availability) => {
      if (!cancelled) setPublisher(availability);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const collect = async () => {
    if (
      !todo.publishedUrl ||
      !publisher?.installed ||
      !['twitter_x', 'xiaohongshu'].includes(todo.channelId)
    ) {
      return;
    }
    setCollecting(true);
    setMessage(isZh ? '正在后台抓取公开数据…' : 'Collecting metrics in the background…');
    try {
      const task = collectMetricsWithExtension(
        todo.channelId as SupportedPublishChannel,
        todo.publishedUrl,
        (event) => setMessage(event.error || event.message || '')
      );
      const result = await task.completion;
      if (!result.metrics) throw new Error(isZh ? '没有读取到指标' : 'No metrics found');
      onSnapshot({
        id: crypto.randomUUID(),
        collectedAt: Date.now(),
        source: 'extension',
        metrics: result.metrics,
      });
      setMessage(isZh ? '数据已更新。' : 'Metrics updated.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : isZh
            ? '自动采集失败，可以手动录入。'
            : 'Collection failed. You can enter metrics manually.'
      );
      setShowManual(true);
    } finally {
      setCollecting(false);
    }
  };

  const saveManual = () => {
    const metrics: PostMetrics = {};
    for (const field of fields) {
      const value = Number(manualValues[field]);
      if (Number.isFinite(value) && value >= 0) metrics[field] = Math.round(value);
    }
    if (Object.keys(metrics).length === 0) {
      setMessage(isZh ? '请至少填写一个指标。' : 'Enter at least one metric.');
      return;
    }
    onSnapshot({
      id: crypto.randomUUID(),
      collectedAt: Date.now(),
      source: 'manual',
      metrics,
    });
    setManualValues({});
    setShowManual(false);
    setMessage(isZh ? '手动数据已保存。' : 'Manual metrics saved.');
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            {isZh ? '帖子表现' : 'Post performance'}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {latest
              ? `${isZh ? '更新于' : 'Updated'} ${new Date(latest.collectedAt).toLocaleString(
                  isZh ? 'zh-CN' : 'en-US'
                )} · ${latest.source === 'extension' ? (isZh ? '插件采集' : 'Extension') : isZh ? '手动录入' : 'Manual'}`
              : isZh
                ? '发布后还没有数据'
                : 'No metrics collected yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {publisher?.installed ? (
            <button
              onClick={() => void collect()}
              disabled={collecting}
              className="h-9 rounded-full bg-ink px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:bg-zinc-300"
            >
              {collecting
                ? isZh
                  ? '更新中…'
                  : 'Updating…'
                : isZh
                  ? '立即更新'
                  : 'Update now'}
            </button>
          ) : (
            <Link
              href="/app/publisher-extension"
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              {isZh ? '安装插件后更新' : 'Install to update'}
            </Link>
          )}
          <button
            onClick={() => setShowManual((value) => !value)}
            className="h-9 rounded-full bg-paper-dim px-4 text-xs font-medium text-ink-soft hover:bg-zinc-200"
          >
            {isZh ? '手动录入' : 'Enter manually'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {fields.map((field) => {
          const current = latest?.metrics[field];
          const old = previous?.metrics[field];
          const delta =
            current !== undefined && old !== undefined ? current - old : undefined;
          return (
            <div key={field} className="rounded-xl bg-paper-dim p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                {isZh ? FIELD_LABELS[field].zh : FIELD_LABELS[field].en}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-ink">
                {formatMetric(current)}
              </p>
              {delta !== undefined && delta !== 0 && (
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  {delta > 0 ? '+' : ''}
                  {formatMetric(delta)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {message && (
        <p className="mt-3 rounded-xl bg-paper-dim px-3 py-2 text-[11px] text-ink-soft">
          {message}
        </p>
      )}

      {showManual && (
        <div className="mt-3 rounded-2xl bg-paper-dim p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {fields.map((field) => (
              <label key={field} className="block">
                <span className="text-[10px] font-medium text-zinc-400">
                  {isZh ? FIELD_LABELS[field].zh : FIELD_LABELS[field].en}
                </span>
                <input
                  type="number"
                  min="0"
                  value={manualValues[field] ?? ''}
                  onChange={(event) =>
                    setManualValues((values) => ({
                      ...values,
                      [field]: event.target.value,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-xl bg-white px-3 text-xs text-ink outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={saveManual}
              className="h-9 rounded-full bg-ink px-4 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              {isZh ? '保存这次快照' : 'Save snapshot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

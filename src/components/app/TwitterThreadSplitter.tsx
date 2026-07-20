'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { splitTextToTweets } from '@/lib/gtm/thread-split';

interface Props {
  text: string;
  limit?: number;
}

export default function TwitterThreadSplitter({ text, limit = 140 }: Props) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [copiedIndex, setCopiedIndex] = useState<number | 'all' | null>(null);

  const segments = useMemo(
    () => splitTextToTweets(text, limit),
    [text, limit]
  );

  const copyText = async (value: string, index: number | 'all') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts; ignore quietly.
    }
  };

  if (segments.length === 0) return null;

  return (
    <div className="mt-6 border-t border-zinc-100 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            {isZh ? 'Thread 拆分' : 'Thread split'}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {isZh
              ? `按 ${limit} 字符拆成 ${segments.length} 条，逐条复制后在 X 发布`
              : `Split into ${segments.length} tweets (${limit} chars each). Copy and post one by one.`}
          </p>
        </div>
        {segments.length > 1 && (
          <button
            type="button"
            onClick={() => void copyText(segments.join('\n\n---\n\n'), 'all')}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-paper-dim px-3 text-xs font-medium text-ink transition-colors hover:bg-zinc-200"
          >
            {copiedIndex === 'all'
              ? isZh
                ? '已复制全部'
                : 'All copied'
              : isZh
                ? '复制全部'
                : 'Copy all'}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="rounded-xl bg-paper-dim p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
                    {index + 1}/{segments.length}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {segment.length}/{limit}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                  {segment}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyText(segment, index)}
                className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-xs font-medium text-ink transition-colors hover:bg-zinc-100"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
                {copiedIndex === index
                  ? isZh
                    ? '已复制'
                    : 'Copied'
                  : isZh
                    ? '复制'
                    : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

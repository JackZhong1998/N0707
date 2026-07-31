'use client';

/** 对话流中的功能卡片：Agent 后台任务进度 / 策略完成卡片 / 日历就绪卡片 */

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function AgentTaskCard({
  label,
  status,
}: {
  label: string;
  status: 'running' | 'done' | 'error';
}) {
  return (
    <div className="mt-2 inline-flex max-w-md items-center gap-3 rounded-2xl border border-hairline bg-paper-dim px-4 py-3">
      {status === 'running' && (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ink" />
        </span>
      )}
      {status === 'done' && (
        <svg className="h-4 w-4 shrink-0 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {status === 'error' && (
        <svg className="h-4 w-4 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <p className={`text-[13px] ${status === 'error' ? 'text-zinc-400' : 'text-ink-soft'}`}>{label}</p>
    </div>
  );
}

export function StrategyCard({
  title,
  channelIds,
}: {
  title: string;
  channelIds: string[];
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  return (
    <Link
      href="/app/blueprint"
      className="group mt-2 block max-w-md overflow-hidden rounded-2xl border border-ink bg-white transition-colors hover:bg-ink"
    >
      <div className="border-b border-hairline px-4 py-2.5 group-hover:border-zinc-700">
        <p className="index-label group-hover:!text-zinc-400">
          {isZh ? '市场策略 · 已生成' : 'Strategy · Ready'}
        </p>
      </div>
      <div className="px-4 py-4">
        <p className="font-[family-name:var(--font-display)] text-base font-bold text-ink group-hover:text-white">
          {title}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {isZh
            ? `覆盖 ${channelIds.length} 个渠道 · 点击查看并提出修改意见`
            : `${channelIds.length} channels · click to review & refine`}
        </p>
        <p className="mt-3 text-xs font-medium text-ink group-hover:text-white">
          {isZh ? '查看策略 →' : 'View strategy →'}
        </p>
      </div>
    </Link>
  );
}

export function CalendarCard({ title }: { title: string }) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  return (
    <Link
      href="/app/calendar"
      className="group mt-2 block max-w-md overflow-hidden rounded-2xl border border-ink bg-ink transition-colors hover:bg-white"
    >
      <div className="border-b border-zinc-700 px-4 py-2.5 group-hover:border-hairline">
        <p className="index-label !text-zinc-400">
          {isZh ? '行动日历 · 已就绪' : 'Calendar · Ready'}
        </p>
      </div>
      <div className="px-4 py-4">
        <p className="font-[family-name:var(--font-display)] text-base font-bold text-white group-hover:text-ink">
          {title}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {isZh
            ? '30 天，每天知道做什么 · 点击进入你的日历'
            : '30 days, every day mapped out · open your calendar'}
        </p>
        <p className="mt-3 text-xs font-medium text-white group-hover:text-ink">
          {isZh ? '进入行动日历 →' : 'Open calendar →'}
        </p>
      </div>
    </Link>
  );
}

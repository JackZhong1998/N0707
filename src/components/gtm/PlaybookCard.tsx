'use client';

import type { PlaybookDisplay } from '@/lib/agents/skills/registry';

const CHANNEL_BADGES: Record<string, string> = {
  xiaohongshu: 'bg-rose-50 text-rose-700 border-rose-200',
  user_outreach: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  website_copy: 'bg-sky-50 text-sky-700 border-sky-200',
  wechat_official: 'bg-green-50 text-green-700 border-green-200',
  user_interview: 'bg-amber-50 text-amber-700 border-amber-200',
  product_hunt: 'bg-orange-50 text-orange-700 border-orange-200',
  twitter_x: 'bg-gray-100 text-gray-700 border-gray-200',
  linkedin: 'bg-blue-50 text-blue-700 border-blue-200',
};

interface PlaybookCardProps {
  playbook: PlaybookDisplay;
  locale: string;
  compact?: boolean;
}

export default function PlaybookCard({ playbook, locale, compact }: PlaybookCardProps) {
  const isZh = locale === 'zh';
  const badge = CHANNEL_BADGES[playbook.channelId] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${badge}`}
        >
          {isZh ? playbook.name : playbook.nameEn}
        </span>
        <span className="text-[11px] text-gray-400">
          {isZh ? `每周 ${playbook.postsPerWeek} 次动作` : `${playbook.postsPerWeek}x / week`}
        </span>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.11l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.5z" />
        </svg>
        {playbook.playbook.credibility}
      </p>

      {!compact && (
        <>
          <ul className="mt-3 space-y-1.5">
            {playbook.playbook.principles.map((principle, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-gray-700">
                <svg className="mt-1 h-3 w-3 shrink-0 text-gray-900" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {principle}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
            <span className="font-medium text-gray-600">{isZh ? '预期节奏：' : 'Expectation: '}</span>
            {playbook.playbook.expectation}
          </p>
        </>
      )}
    </div>
  );
}

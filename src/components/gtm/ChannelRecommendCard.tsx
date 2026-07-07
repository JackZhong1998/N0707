'use client';

import type { CmoChannelRecommendation } from '@/lib/gtm/types';

interface ChannelRecommendCardProps {
  recommendation: CmoChannelRecommendation;
  onToggle: (section: 'wave1' | 'wave2' | 'phase0', channelId: string) => void;
  locale: string;
}

export default function ChannelRecommendCard({
  recommendation,
  onToggle,
  locale,
}: ChannelRecommendCardProps) {
  const isZh = locale === 'zh';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">
        {isZh ? '推荐作战方案 · 基于你的产品画像' : 'Recommended plan · based on your profile'}
      </h3>

      {recommendation.phase0.length > 0 && (
        <Section
          title={isZh ? 'Phase 0（建议先验证）' : 'Phase 0 (Validate first)'}
          channels={recommendation.phase0}
          section="phase0"
          onToggle={onToggle}
        />
      )}

      <Section
        title={isZh ? '第一波（立即执行）' : 'Wave 1 (Execute now)'}
        channels={recommendation.wave1}
        section="wave1"
        onToggle={onToggle}
      />

      {recommendation.wave2.length > 0 && (
        <Section
          title={isZh ? '第二波（有信号后启动）' : 'Wave 2 (After signals)'}
          channels={recommendation.wave2}
          section="wave2"
          onToggle={onToggle}
        />
      )}
    </div>
  );
}

function Section({
  title,
  channels,
  section,
  onToggle,
}: {
  title: string;
  channels: CmoChannelRecommendation['wave1'];
  section: 'wave1' | 'wave2' | 'phase0';
  onToggle: (section: 'wave1' | 'wave2' | 'phase0', channelId: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <div className="mt-2 space-y-2">
        {channels.map((ch) => (
          <label
            key={ch.channelId}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={ch.selected}
              onChange={() => onToggle(section, ch.channelId)}
              className="mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
            <div>
              <span className="font-medium text-gray-900">{ch.name}</span>
              <p className="text-sm text-gray-500">{ch.reason}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

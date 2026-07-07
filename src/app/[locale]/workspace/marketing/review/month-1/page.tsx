'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import type { WeeklyReview } from '@/lib/gtm/types';

export default function Month1ReviewPage() {
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated, updateState, resetState } = useGtm();
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (state.weeklyReviews[30]) {
      setReview(state.weeklyReviews[30]);
      setLoading(false);
      return;
    }
    fetchReview();
  }, [hydrated]);

  const fetchReview = async () => {
    try {
      const res = await fetch('/api/gtm/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayIndex: 30,
          calendar: state.unifiedCalendar,
          feedbacks: state.taskFeedbacks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReview(data.review);
      updateState({
        weeklyReviews: { ...state.weeklyReviews, 30: data.review },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewCampaign = () => {
    resetState();
    router.push('/workspace/onboarding');
  };

  if (!hydrated || loading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  if (!review) {
    return (
      <div className="p-8 text-center text-gray-500">
        {isZh ? '复盘生成失败' : 'Failed to generate review'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">
        {isZh ? '🎉 30 天月度复盘' : '🎉 30-day Monthly Review'}
      </h1>
      <p className="mt-2 text-gray-500">{review.summary}</p>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">
            {isZh ? '计划完成率' : 'Plan completion'}
          </h3>
          <p className="mt-2 text-3xl font-bold text-primary-600">
            {Math.round(review.executionRate * 100)}%
          </p>
        </div>

        {review.contentInsights.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="font-semibold text-gray-900">
              {isZh ? '最有效的内容类型' : 'Best performing content'}
            </h3>
            <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
              {review.contentInsights.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {review.adjustments.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="font-semibold text-gray-900">
              {isZh ? '下一阶段建议' : 'Next phase recommendations'}
            </h3>
            <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
              {review.adjustments.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={handleNewCampaign}
          className="w-full rounded-xl bg-primary-600 py-4 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {isZh ? '开始下一轮市场策略' : 'Start next market strategy cycle'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/pricing')}
          className="w-full rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50"
        >
          {isZh ? '续费 Pro 方案' : 'Renew Pro plan'}
        </button>
      </div>
    </div>
  );
}

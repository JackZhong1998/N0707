'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import type { WeeklyReview } from '@/lib/gtm/types';

export default function Week1ReviewPage() {
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated, updateState } = useGtm();
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (state.weeklyReviews[7]) {
      setReview(state.weeklyReviews[7]);
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
          dayIndex: 7,
          calendar: state.unifiedCalendar,
          feedbacks: state.taskFeedbacks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReview(data.review);
      updateState({
        weeklyReviews: { ...state.weeklyReviews, 7: data.review },
        phase: 'review',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (review) {
      updateState({
        weeklyReviews: {
          ...state.weeklyReviews,
          7: { ...review, appliedAt: Date.now() },
        },
        phase: 'execution',
      });
    }
    router.push('/workspace/marketing/today');
  };

  if (!hydrated || loading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  if (!review) {
    return (
      <div className="p-8 text-center text-gray-500">
        {isZh ? '战报生成失败' : 'Failed to generate report'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">
        {isZh ? '📊 首周战报' : '📊 Week 1 Report'}
      </h1>
      <p className="mt-2 text-gray-500">{review.summary}</p>

      <div className="mt-8 space-y-6">
        <ReportSection
          title={isZh ? '执行率 (L1)' : 'Execution rate (L1)'}
          content={`${Math.round(review.executionRate * 100)}%`}
        />
        <ReportSection
          title={isZh ? '市场信号 (L2)' : 'Market signals (L2)'}
          items={review.topSignals}
        />
        <ReportSection
          title={isZh ? '内容洞察' : 'Content insights'}
          items={review.contentInsights}
        />
        <ReportSection
          title={isZh ? '建议调整' : 'Suggested adjustments'}
          items={review.adjustments}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/workspace/marketing/today')}
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50"
        >
          {isZh ? '继续执行' : 'Continue'}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {isZh ? '应用调整' : 'Apply adjustments'}
        </button>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  content,
  items,
}: {
  title: string;
  content?: string;
  items?: string[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {content && <p className="mt-2 text-2xl font-bold text-primary-600">{content}</p>}
      {items && items.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

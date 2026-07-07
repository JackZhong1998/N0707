'use client';

import { useState } from 'react';
import type { SignalType } from '@/lib/gtm/types';

const SIGNALS: { value: SignalType; zh: string; en: string }[] = [
  { value: 'none', zh: '没什么反应', en: 'No reaction' },
  { value: 'engagement', zh: '点赞/收藏', en: 'Likes/saves' },
  { value: 'comment_dm', zh: '评论/私信', en: 'Comments/DMs' },
  { value: 'click_lead', zh: '点击链接/咨询', en: 'Clicks/leads' },
  { value: 'conversion', zh: '成交', en: 'Conversion' },
];

interface ReviewCardModalProps {
  taskId: string;
  locale: string;
  onSubmit: (data: {
    published: boolean;
    signals: SignalType[];
    conversionNote?: string;
    feelingNote?: string;
  }) => void;
  onClose: () => void;
}

export default function ReviewCardModal({
  locale,
  onSubmit,
  onClose,
}: ReviewCardModalProps) {
  const isZh = locale === 'zh';
  const [published, setPublished] = useState<boolean | null>(null);
  const [signals, setSignals] = useState<SignalType[]>([]);
  const [feelingNote, setFeelingNote] = useState('');
  const [conversionNote, setConversionNote] = useState('');

  const toggleSignal = (s: SignalType) => {
    setSignals((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          {isZh ? '今日复盘' : 'Daily Review'}
        </h3>

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">
            {isZh ? '发出去了吗？' : 'Did you publish?'}
          </p>
          <div className="mt-2 flex gap-2">
            {[
              { val: true, zh: '✅ 已发', en: '✅ Published' },
              { val: false, zh: '❌ 没发', en: '❌ Skipped' },
            ].map((o) => (
              <button
                key={String(o.val)}
                type="button"
                onClick={() => setPublished(o.val)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  published === o.val
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {isZh ? o.zh : o.en}
              </button>
            ))}
          </div>
        </div>

        {published && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700">
              {isZh ? '市场有反应吗？' : 'Any market signals?'}
            </p>
            <div className="mt-2 space-y-1">
              {SIGNALS.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={signals.includes(s.value)}
                    onChange={() => toggleSignal(s.value)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  {isZh ? s.zh : s.en}
                </label>
              ))}
            </div>
          </div>
        )}

        {signals.includes('conversion') && (
          <input
            type="text"
            value={conversionNote}
            onChange={(e) => setConversionNote(e.target.value)}
            placeholder={isZh ? '成交金额（可选）' : 'Amount (optional)'}
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        )}

        <input
          type="text"
          value={feelingNote}
          onChange={(e) => setFeelingNote(e.target.value)}
          placeholder={isZh ? '一句话感受（可选）' : 'One-line feeling (optional)'}
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {isZh ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={published === null}
            onClick={() =>
              onSubmit({
                published: published ?? false,
                signals,
                conversionNote: conversionNote || undefined,
                feelingNote: feelingNote || undefined,
              })
            }
            className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {isZh ? '提交' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

/** 市场总监的问卷式选项卡片 */

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { OptionCard } from '@/lib/gtm/types';

export default function OptionCardView({
  card,
  onSubmit,
  disabled,
}: {
  card: OptionCard;
  onSubmit: (selected: string[], customText?: string) => void;
  disabled: boolean;
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState('');

  const answered = Boolean(card.answered);

  const toggle = (id: string) => {
    if (answered || disabled) return;
    setSelected((prev) =>
      card.multi
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id]
    );
  };

  return (
    <div className="mt-3 w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-white">
      <div className="border-b border-hairline bg-paper-dim px-4 py-2.5">
        <p className="text-[13px] font-semibold text-ink">{card.question}</p>
        <p className="index-label mt-0.5">
          {card.multi ? (isZh ? '可多选' : 'Multi-select') : isZh ? '单选' : 'Single choice'}
        </p>
      </div>

      <div className="divide-y divide-hairline">
        {card.options.map((opt) => {
          const isPicked = answered
            ? card.answered!.includes(opt.label)
            : selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              disabled={answered || disabled}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                answered ? 'cursor-default' : 'hover:bg-paper-dim'
              } ${isPicked ? 'bg-paper-dim' : ''}`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                  card.multi ? '' : 'rounded-full'
                } ${isPicked ? 'border-ink bg-ink' : 'border-zinc-300'}`}
              >
                {isPicked && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm ${isPicked ? 'font-semibold text-ink' : 'font-medium text-ink-soft'}`}>
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="mt-0.5 block text-xs text-zinc-400">{opt.description}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="border-t border-hairline p-3">
          {card.allowCustom && (
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={isZh ? '其他（可填写）' : 'Other (optional)'}
              className="mb-2 w-full rounded-xl border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
            />
          )}
          <button
            onClick={() => onSubmit(selected, custom.trim() || undefined)}
            disabled={disabled || (selected.length === 0 && !custom.trim())}
            className="flex h-9 w-full items-center justify-center rounded-full bg-ink text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200"
          >
            {isZh ? '提交选择' : 'Submit'}
          </button>
        </div>
      )}
      {answered && (
        <div className="border-t border-hairline bg-paper-dim px-4 py-2">
          <p className="text-xs text-zinc-500">
            {isZh ? '已提交：' : 'Submitted: '}
            {card.answered!.join('、')}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * 冷启动问卷卡片：多道单选/多选题一次答完。
 * 每个用户都要回答的标准化问题（市场 / 产品状态 / 团队 / 时间投入），
 * 进入对话第一时间展示，答完一并提交给市场总监。
 */

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { KickoffCard } from '@/lib/gtm/types';

export default function KickoffCardView({
  card,
  onSubmit,
  disabled,
}: {
  card: KickoffCard;
  onSubmit: (answers: Record<string, string[]>) => void;
  disabled: boolean;
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const answered = Boolean(card.answered);

  const toggle = (qid: string, optId: string, multi: boolean) => {
    if (answered || disabled) return;
    setSelected((prev) => {
      const cur = prev[qid] ?? [];
      const next = multi
        ? cur.includes(optId)
          ? cur.filter((x) => x !== optId)
          : [...cur, optId]
        : [optId];
      return { ...prev, [qid]: next };
    });
  };

  const allAnswered = card.questions.every((q) => (selected[q.id] ?? []).length > 0);

  const submit = () => {
    const labels: Record<string, string[]> = {};
    for (const q of card.questions) {
      labels[q.id] = q.options
        .filter((o) => (selected[q.id] ?? []).includes(o.id))
        .map((o) => o.label);
    }
    onSubmit(labels);
  };

  return (
    <div className="mt-3 w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-white">
      <div className="bg-ink px-4 py-3">
        <p className="text-[13px] font-semibold text-white">{card.title}</p>
      </div>

      <div className="divide-y divide-hairline">
        {card.questions.map((q, qi) => (
          <div key={q.id} className="px-4 py-3.5">
            <div className="flex items-baseline gap-2">
              <span className="index-label">{String(qi + 1).padStart(2, '0')}</span>
              <p className="text-[13px] font-semibold text-ink">{q.question}</p>
              <span className="text-[10px] text-zinc-400">
                {q.multi ? (isZh ? '可多选' : 'multi') : isZh ? '单选' : 'single'}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {q.options.map((opt) => {
                const isPicked = answered
                  ? (card.answered?.[q.id] ?? []).includes(opt.label)
                  : (selected[q.id] ?? []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggle(q.id, opt.id, q.multi)}
                    disabled={answered || disabled}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isPicked
                        ? 'border-ink bg-ink text-white'
                        : 'border-hairline text-ink-soft hover:border-zinc-400'
                    } ${answered ? 'cursor-default' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!answered ? (
        <div className="border-t border-hairline p-3">
          <button
            onClick={submit}
            disabled={disabled || !allAnswered}
            className="flex h-9 w-full items-center justify-center rounded-full bg-ink text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200"
          >
            {allAnswered
              ? isZh ? '提交，开始定制我的计划' : 'Submit & start my plan'
              : isZh ? '每题选一个答案后提交' : 'Answer every question to submit'}
          </button>
        </div>
      ) : (
        <div className="border-t border-hairline bg-paper-dim px-4 py-2">
          <p className="text-xs text-zinc-500">{isZh ? '已提交' : 'Submitted'}</p>
        </div>
      )}
    </div>
  );
}

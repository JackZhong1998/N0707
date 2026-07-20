'use client';

/**
 * 冷启动问卷卡片：多道单选/多选题一次答完。
 * 每个用户都要回答的标准化问题（市场 / 产品状态 / 团队 / 时间投入），
 * 进入对话第一时间展示，答完一并提交给市场总监。
 *
 * 若产品状态为「已上线可用」或「已上线且有一些用户」，额外展示产品链接输入框，
 * 提交后自动触发 research_product 研究 Agent。
 */

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { isLiveProductStage } from '@/lib/gtm/kickoff';
import type { KickoffCard } from '@/lib/gtm/types';

function isValidUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export default function KickoffCardView({
  card,
  onSubmit,
  disabled,
}: {
  card: KickoffCard;
  onSubmit: (answers: Record<string, string[]>, productUrl?: string) => void;
  disabled: boolean;
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [productUrl, setProductUrl] = useState(card.productUrl ?? '');

  const answered = Boolean(card.answered);
  const stageIds = selected['stage'] ?? [];
  const needsProductUrl = stageIds.some(isLiveProductStage);
  const productUrlValid = !needsProductUrl || isValidUrl(productUrl);

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

  const allAnswered =
    card.questions.every((q) => (selected[q.id] ?? []).length > 0) &&
    productUrlValid;

  const submit = () => {
    const labels: Record<string, string[]> = {};
    for (const q of card.questions) {
      labels[q.id] = q.options
        .filter((o) => (selected[q.id] ?? []).includes(o.id))
        .map((o) => o.label);
    }
    onSubmit(labels, needsProductUrl ? productUrl.trim() : undefined);
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

        {(needsProductUrl || (answered && card.productUrl)) && (
          <div className="px-4 py-3.5">
            <div className="flex items-baseline gap-2">
              <span className="index-label">+</span>
              <p className="text-[13px] font-semibold text-ink">
                {isZh ? '你的产品链接是？' : 'What is your product URL?'}
              </p>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              {isZh
                ? '我们会自动读取官网、分析竞品，帮你快速建立产品档案'
                : 'We will read your site and analyze competitors to build your product profile'}
            </p>
            {answered && card.productUrl ? (
              <p className="mt-2 truncate text-xs text-ink-soft">{card.productUrl}</p>
            ) : (
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                disabled={answered || disabled}
                placeholder={isZh ? 'https://yourproduct.com' : 'https://yourproduct.com'}
                className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-xs text-ink placeholder:text-zinc-300 focus:border-ink focus:outline-none disabled:bg-paper-dim"
              />
            )}
          </div>
        )}
      </div>

      {!answered ? (
        <div className="border-t border-hairline p-3">
          <button
            onClick={submit}
            disabled={disabled || !allAnswered}
            className="flex h-9 w-full items-center justify-center rounded-full bg-ink text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200"
          >
            {allAnswered
              ? needsProductUrl
                ? isZh
                  ? '提交并开始研究产品'
                  : 'Submit & research my product'
                : isZh
                  ? '提交，开始定制我的计划'
                  : 'Submit & start my plan'
              : needsProductUrl && !productUrlValid
                ? isZh
                  ? '请填写有效的产品链接'
                  : 'Enter a valid product URL'
                : isZh
                  ? '每题选一个答案后提交'
                  : 'Answer every question to submit'}
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

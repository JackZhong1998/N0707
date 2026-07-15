'use client';

/**
 * 支付墙弹窗（暂不接入 Stripe，模拟支付解锁）
 */

import { useLocale } from 'next-intl';

export default function Paywall({
  open,
  onClose,
  onUnlock,
}: {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  if (!open) return null;

  const bullets = isZh
    ? [
        '市场总监 1 对 1 对话，弄清你的产品与人群',
        '策略 Agent 产出 30 天冷启动市场策略',
        '渠道专员编写每天的 To-Do 与发布内容',
        '不满意随时对话修改，一键跳转发布',
      ]
    : [
        '1:1 conversation with your marketing director',
        'A 30-day cold-start strategy built for you',
        'Daily to-dos and ready-to-publish drafts',
        'Revise via chat, publish in one click',
      ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-fade-in-up bg-white p-8 sm:border sm:border-hairline"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="index-label">NowBuild Pro</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink">
          {isZh ? '解锁你的专属 30 天行动日历' : 'Unlock your own 30-day calendar'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {isZh
            ? '你看到的是一份示例日历。完成解锁后，市场总监将为你的产品定制一份真正属于你的。'
            : 'What you see is a sample. Unlock to have the director build one for your product.'}
        </p>

        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-ink">
            $19
          </span>
          <span className="text-sm text-zinc-400">/ {isZh ? '月' : 'month'}</span>
        </div>

        <button
          onClick={onUnlock}
          className="mt-6 flex h-12 w-full items-center justify-center bg-ink text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          {isZh ? '立即解锁（演示：直接解锁）' : 'Unlock now (demo: instant)'}
        </button>
        <button
          onClick={onClose}
          className="mt-2 flex h-10 w-full items-center justify-center text-sm text-zinc-400 transition-colors hover:text-ink"
        >
          {isZh ? '再看看' : 'Not yet'}
        </button>
      </div>
    </div>
  );
}

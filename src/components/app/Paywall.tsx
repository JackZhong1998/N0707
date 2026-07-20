'use client';

/**
 * 支付墙弹窗：创建 Stripe Checkout 订阅会话。
 */

import { useState } from 'react';
import { useLocale } from 'next-intl';

export default function Paywall({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  if (!open) return null;

  const startCheckout = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', billingCycle, locale }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? `Checkout failed (${response.status})`);
      }
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : isZh
            ? '无法发起支付'
            : 'Unable to start checkout'
      );
      setLoading(false);
    }
  };

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

  const monthlyPrice = '$19.90';
  const yearlyPrice = '$199';
  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const displayPeriod =
    billingCycle === 'monthly'
      ? isZh
        ? '月'
        : 'month'
      : isZh
        ? '年'
        : 'year';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-fade-in-up rounded-t-3xl bg-white p-8 sm:rounded-3xl sm:border sm:border-hairline"
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

        <div className="mt-8 inline-flex w-full items-center gap-1 rounded-full bg-paper-dim p-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {isZh ? '月付' : 'Monthly'}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              billingCycle === 'yearly'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {isZh ? '年付' : 'Yearly'}
            <span className="ml-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {isZh ? '省 $39.80' : 'Save $39.80'}
            </span>
          </button>
        </div>

        <div className="mt-6 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-ink">
            {displayPrice}
          </span>
          <span className="text-sm text-zinc-400">/ {displayPeriod}</span>
        </div>
        {billingCycle === 'yearly' && (
          <p className="mt-1 text-sm text-emerald-600">
            {isZh ? '相当于 $16.58/月' : '≈ $16.58/month'}
          </p>
        )}

        <button
          onClick={startCheckout}
          disabled={loading}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500"
        >
          {loading
            ? isZh
              ? '正在前往安全支付页…'
              : 'Opening secure checkout…'
            : isZh
              ? '使用 Stripe 安全解锁'
              : 'Unlock securely with Stripe'}
        </button>
        {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
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

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { CONFIGURED_DIRECTORY_COUNT } from '@/lib/directories/automation';

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

  if (!open) return null;

  const benefits = isZh
    ? [
        ['每天约 30 分钟审核', '研究、内容和发布材料提前准备好'],
        ['30 天 Launch Blueprint', '定位、目标用户、渠道优先级与四周方向'],
        ['每日可审核的交付', '内容草稿、制作 Brief、发布包和渠道任务'],
        ['完整渠道执行', '社交、社区、视频、SEO、官网与产品发布'],
        [`${CONFIGURED_DIRECTORY_COUNT} 个目录自动提交`, '从 100+ 机会中匹配并跟踪提交状态'],
        ['每周复盘与最终报告', '汇总市场反馈、PMF 信号和下一步建议'],
      ]
    : [
        ['About 30 minutes of review a day', 'Research, content, and publishing materials arrive prepared'],
        ['30-day Launch Blueprint', 'Position, audience, channel priorities, and four-week direction'],
        ['Ready-to-review daily work', 'Drafts, production briefs, launch packages, and channel tasks'],
        ['Complete channel execution', 'Social, community, video, SEO, website, and product launches'],
        [`Automated submission to ${CONFIGURED_DIRECTORY_COUNT} directories`, 'Matched from 100+ opportunities with submission status tracked'],
        ['Weekly reviews and final report', 'Market feedback, PMF signals, and a recommended next move'],
      ];

  const startCheckout = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', billingCycle: 'monthly', locale }),
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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl animate-fade-in-up rounded-t-3xl bg-white p-6 sm:rounded-3xl sm:border sm:border-hairline sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="index-label">
            {isZh ? '产品分析已完成' : 'Product analysis complete'}
          </p>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            {isZh ? '$49 / 月' : '$49 / mo'}
          </span>
        </div>

        <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {isZh
            ? '把每天数小时的冷启动准备，交给你的 Launch Team。'
            : 'Hand hours of daily launch prep to your Launch Team.'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {isZh
            ? 'Launch Brief 已就绪。订阅后，团队会准备策略、内容、发布材料和目录提交；你每天只需用约 30 分钟审核、修改和确认。'
            : 'Your Launch Brief is ready. Subscribe to have strategy, content, publishing assets, and directory submissions prepared—leaving about 30 minutes a day for review, refinement, and approval.'}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-zinc-100 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {isZh ? '传统精简增长团队' : 'Lean human growth team'}
            </p>
            <p className="mt-2 text-2xl font-bold text-ink">
              $2,000+
              <span className="ml-1 text-xs font-normal text-zinc-500">
                {isZh ? '/月' : '/month'}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isZh ? '每天数小时准备、沟通和管理' : 'Hours of daily prep and management'}
            </p>
          </div>
          <div className="rounded-2xl bg-ink p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-300">
              NowBuild Agent Team
            </p>
            <p className="mt-2 text-2xl font-bold">
              $49
              <span className="ml-1 text-xs font-normal text-zinc-400">
                {isZh ? '/月' : '/month'}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {isZh ? '每天约 30 分钟审核 · 随时取消' : 'About 30 min/day to review · cancel anytime'}
            </p>
          </div>
        </div>

        <p className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-500">
          {isZh ? '订阅一个月，你会得到' : 'What one month gives you'}
        </p>
        <ul className="mt-5 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          {benefits.map(([title, detail]) => (
            <li key={title} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>
                <strong className="text-ink">{title}：</strong>
                {detail}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-zinc-200 pt-5">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-ink">
                $49
              </span>
              <span className="text-sm text-zinc-400">{isZh ? '/ 月' : '/ month'}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {isZh
                ? '1 个产品 · 1 轮完整冷启动 · 每天约 30 分钟审核'
                : '1 product · 1 complete launch · about 30 min/day to review'}
            </p>
          </div>
          <button
            onClick={startCheckout}
            disabled={loading}
            className="flex h-12 min-w-64 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500"
          >
            {loading
              ? isZh
                ? '正在前往安全支付页…'
                : 'Opening secure checkout…'
              : 'Build My Launch Team'}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-400">
          {isZh
            ? '今天收取 $49，之后按月自动续费，可随时取消。取消支付将返回 Launch Brief，分析结果与纠正内容会保留。'
            : '$49 today, then renews monthly; cancel anytime. Canceling returns you to the Launch Brief with analysis and corrections kept.'}
        </p>
        {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
        <button
          onClick={onClose}
          className="mt-1 flex h-9 w-full items-center justify-center text-sm text-zinc-400 transition-colors hover:text-ink"
        >
          {isZh ? '返回 Launch Brief' : 'Back to Launch Brief'}
        </button>
      </div>
    </div>
  );
}

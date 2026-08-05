'use client';

import { Suspense } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import PricingCheckoutButton from '@/components/pricing/PricingCheckoutButton';
import { CONFIGURED_DIRECTORY_COUNT } from '@/lib/directories/automation';

export default function PricingPageClient() {
  const locale = useLocale();
  const t = useTranslations('Pricing');
  const isZh = locale === 'zh';

  const freeFeatures = isZh
    ? ['读取官网，建立产品档案', '梳理目标用户、竞品和市场定位', '推荐适合这次冷启动的渠道', '预览前 7 天行动日历', '预览 10 个匹配目录和 1 篇完整内容']
    : ['Website analysis and product profile', 'Audience, competitor, and positioning research', 'Channels selected for this campaign', 'First 7 days of the calendar', '10 matched directories and one complete draft'];

  const agentGroups = isZh
    ? [
        ['每天节省数小时', '研究、选题、内容和发布材料提前准备，你每天约 30 分钟审核、修改和确认'],
        ['一份 30 天推广蓝图', '产品定位、目标用户、渠道优先级和四周推进方向'],
        ['每天都有可审核的工作', '内容草稿、视频制作说明、社区发布素材包和明确的渠道任务'],
        ['覆盖关键市场渠道', '社交、私域、社区、产品发布、视频、SEO 和官网转化'],
        [`${CONFIGURED_DIRECTORY_COUNT} 个目录自动提交`, '从 100+ 目录机会中智能匹配，并跟踪提交与发布状态'],
        ['每周复盘与下一步', '汇总发布记录、市场反馈和早期契合信号，告诉你接下来该做什么'],
      ]
    : [
        ['Save hours every day', 'Research, topics, content, and publishing materials arrive prepared for about 30 minutes of review, refinement, and approval'],
        ['One 30-day Launch Blueprint', 'Product position, audience, channel priorities, and a four-week direction'],
        ['Ready-to-review work every day', 'Content drafts, video production briefs, community launch packages, and clear channel tasks'],
        ['Coverage across the market', 'Social, owned reach, communities, launches, video, SEO, and website conversion'],
        [`Automated submission to ${CONFIGURED_DIRECTORY_COUNT} directories`, 'Matched from 100+ opportunities, with submission and publishing status tracked'],
        ['Weekly reviews and a next move', 'Publishing records, market feedback, and early PMF signals turned into a clear recommendation'],
      ];

  return (
    <>
      <Navbar variant="dark" />
      <main className="bg-canvas-warm">
        <section className="overflow-hidden bg-night px-5 pb-24 pt-36 text-white sm:px-8 sm:pb-28">
          <div className="mx-auto max-w-5xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              {isZh ? '为独立开发者而设的 30 天冷启动团队' : 'A 30-day agent launch team for solo founders'}
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl font-[family-name:var(--font-display)] text-5xl font-bold leading-[.98] tracking-[-.05em] sm:text-7xl">
              {isZh ? '把每天数小时的冷启动准备，变成约 30 分钟审核。' : 'Turn hours of daily launch prep into a 30-minute review.'}
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-zinc-300">
              {isZh
                ? '智能团队负责研究市场、规划内容、准备发布材料并自动提交目录。你只需要审核、修改和确认，团队会把市场反馈带回下一步计划。'
                : 'Your Launch Team researches the market, plans content, prepares publishing assets, and automates directory submissions. You review, refine, and approve while the team carries feedback into the next move.'}
            </p>
            <p className="mt-6 text-sm font-medium text-zinc-400">
              {isZh ? '无需付费推广 · 不用找 Agency · 对 Solo Founder 和 Indie Maker 友好' : 'No paid promotion · No agency · Built for solo founders and indie makers'}
            </p>
          </div>
        </section>

        <section className="border-b border-zinc-200 bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-[2rem] bg-zinc-100 p-8 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-zinc-500">{isZh ? '传统的小型增长团队' : 'Lean human growth team'}</p>
                <p className="mt-6 text-5xl font-bold tracking-tight text-ink">$2,000+</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {isZh ? '每月。研究、策略、内容、社区和分发往往要找多位兼职或自由职业者；你还要每天投入数小时沟通、准备和管理。' : 'Per month. Research, strategy, content, community, and distribution usually require several freelance or part-time roles—plus hours of preparation and management every day.'}
                </p>
              </article>
              <article className="rounded-[2rem] bg-ink p-8 text-white sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-brand-300">{isZh ? 'NowBuild 智能推广团队' : 'NowBuild Agent Team'}</p>
                <p className="mt-6 text-5xl font-bold tracking-tight">$49</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {isZh ? '每月。研究、内容和发布材料每天提前准备好，你只需用约 30 分钟审核、修改和确认。' : 'Per month. Research, content, and publishing materials arrive prepared; you spend about 30 minutes reviewing, refining, and approving.'}
                </p>
              </article>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              {isZh
                ? '这里比较的是冷启动阶段的工作覆盖范围；智能团队并不等同于真人雇员或代运营服务。'
                : 'This compares launch-work coverage; agents are not human employees or a managed-service agency.'}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <article className="flex flex-col rounded-[2rem] border border-zinc-200 bg-white p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-zinc-400">{isZh ? '先看方向，再做决定' : 'See the value first'}</p>
              <h2 className="mt-5 text-3xl font-bold text-ink">{isZh ? '免费预览' : 'Free Preview'}</h2>
              <p className="mt-3 text-sm leading-7 text-ink-muted">
                {isZh ? '先让团队读懂产品，看看这次冷启动应该如何展开。' : 'Let the agents learn your product and show how they would organize the launch.'}
              </p>
              <p className="mt-6 text-5xl font-bold tracking-tight text-ink">$0</p>
              <ul className="mt-8 flex-1 space-y-4 border-t border-zinc-200 pt-8">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-6 text-ink-soft"><span className="text-emerald-600">✓</span>{feature}</li>
                ))}
              </ul>
              <Link href="/sign-up" className="mt-9 inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 text-sm font-semibold text-ink transition hover:bg-zinc-50">
                {isZh ? '免费生成产品档案' : 'Build My Product Profile Free'}
              </Link>
            </article>

            <article className="relative flex flex-col rounded-[2rem] border border-zinc-900 bg-ink p-8 text-white shadow-2xl sm:p-10">
              <span className="absolute right-7 top-7 rounded-full bg-brand-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300">{isZh ? '现在可用' : 'Available now'}</span>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-brand-300">{isZh ? '完整 30 天' : 'Full 30 days'}</p>
              <h2 className="mt-5 text-3xl font-bold">{isZh ? '30 天冷启动团队' : 'Agent Launch Team'}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                {isZh ? '订阅一个月，获得从市场方向到每日执行、目录提交和最终复盘的一整轮冷启动。' : 'One month covers the full launch loop—from market direction and daily execution to directory submissions and the final review.'}
              </p>
              <div className="mt-7 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tight">$49</span>
                <span className="pb-1 text-sm text-zinc-500">{isZh ? '/ 月' : '/ month'}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">{isZh ? '1 个活跃产品 · 每天约 30 分钟审核 · 随时取消' : '1 active product · about 30 minutes of review a day · cancel anytime'}</p>
              <ul className="mt-8 grid flex-1 gap-4 border-t border-white/10 pt-8 sm:grid-cols-2">
                {agentGroups.map(([title, detail]) => (
                  <li key={title} className="flex gap-3 text-sm leading-6 text-zinc-300">
                    <span className="text-emerald-400">✓</span>
                    <span><strong className="text-white">{title}：</strong>{detail}</span>
                  </li>
                ))}
              </ul>
              <Suspense
                fallback={
                  <div className="mt-9 inline-flex h-13 w-full items-center justify-center rounded-full bg-zinc-300 text-sm font-semibold text-black">
                    {isZh ? '正在前往安全支付页…' : 'Opening secure checkout…'}
                  </div>
                }
              >
                <PricingCheckoutButton
                  className="mt-9 inline-flex h-13 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-300"
                />
              </Suspense>
              <p className="mt-3 text-center text-[11px] leading-5 text-zinc-500">
                {isZh ? '今天支付 $49，立即开始一轮完整的 30 天冷启动；只使用一个月也可以。' : '$49 today starts one complete 30-day launch. Subscribing for only one month is fine.'}
              </p>
            </article>
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-[2rem] border border-zinc-200 bg-white p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-ink">{isZh ? '最后拍板的人，始终是你' : 'You keep final control'}</h2>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              {isZh
                ? '智能团队负责研究、策略、计划、内容和目录自动提交。账号登录、验证码、付费及平台要求的最终确认，仍由你亲自完成。NowBuild 不保存平台密码，也不对第三方审核、排名、流量或增长结果作不切实际的承诺。'
                : 'The agent team handles research, strategy, planning, content, and automated directory submission. You still handle account access, CAPTCHAs, payments, and platform-required confirmation. NowBuild does not store platform passwords or guarantee third-party approval, rankings, traffic, or growth.'}
            </p>
          </div>
        </section>

        <section className="border-t border-zinc-200 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="font-mono text-xs font-semibold uppercase tracking-[.16em] text-brand-700">FAQ</p>
              <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-.04em] text-ink">{t('faq.title')}</h2>
            </div>
            <div className="mt-12 grid gap-4">
              {([0, 1, 2] as const).map((i) => (
                <article key={i} className="rounded-3xl border border-zinc-200 bg-white p-7 sm:p-8">
                  <h3 className="text-lg font-semibold text-ink">{t(`faq.items.${i}.question`)}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink-muted">{t(`faq.items.${i}.answer`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

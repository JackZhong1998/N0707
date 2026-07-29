import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import HeroChannelMarquee from '@/components/landing/HeroChannelMarquee';
import { LogoLetterB } from '@/components/Logo';

export default async function Hero() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  return (
    <section className="relative overflow-hidden bg-night text-white">
      <div className="bg-grid-dark absolute inset-0 opacity-70" aria-hidden />
      <div
        className="absolute left-1/2 top-0 h-[620px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/[0.09] blur-[170px]"
        aria-hidden
      />

      <div className="relative pb-6 pt-24 sm:pb-4 sm:pt-28">
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
          <p className="animate-fade-in font-mono text-xs font-medium uppercase tracking-[0.2em] text-brand-300 motion-reduce:animate-none">
            {isZh
              ? '为独立开发者而设的 30 天冷启动团队'
              : 'YOUR 30-DAY AGENT LAUNCH TEAM'}
          </p>

          <h1 className="animate-fade-in-up delay-100 mx-auto mt-5 max-w-6xl font-[family-name:var(--font-display)] text-[2.8rem] font-bold leading-[0.93] tracking-[-0.06em] text-white sm:mt-7 sm:text-7xl lg:text-[6.25rem] motion-reduce:animate-none">
            <span className="block">
              {isZh ? '产品已经上线。' : 'You built the product.'}
            </span>
            <span className="mt-2 block text-brand-300">
              {isZh ? (
                '接下来，让市场看见它。'
              ) : (
                <span aria-label="Now build the market.">
                  <span aria-hidden="true">Now </span>
                  <span
                    className="inline-flex items-baseline whitespace-nowrap"
                    aria-hidden="true"
                  >
                    <LogoLetterB className="mr-[0.015em] inline-block h-[0.72em] w-[0.84em] shrink-0 translate-y-[0.02em]" />
                    <span>uild</span>
                  </span>
                  <span aria-hidden="true"> the market.</span>
                </span>
              )}
            </span>
          </h1>

          <p className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-3xl text-sm leading-7 text-zinc-300 sm:mt-8 sm:text-xl sm:leading-9 motion-reduce:animate-none">
            {isZh
              ? 'NowBuild 先读懂你的产品，再把市场研究、推广策略、内容创作、社区运营、SEO 和产品分发交给一支协同工作的智能团队。连续 30 天，帮你找到对的人、验证真实需求，也找到最早的产品市场契合信号。'
              : 'NowBuild brings research, strategy, content, community, SEO, and distribution agents into one coordinated 30-day launch campaign—helping you reach the right users, test demand faster, and uncover your first PMF signals.'}
          </p>

          <Link
            href="/sign-up"
            className="animate-fade-in-up delay-300 mt-7 inline-flex h-14 items-center justify-center rounded-full bg-white px-10 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-brand-300 motion-reduce:animate-none sm:mt-10 sm:text-base"
          >
            {isZh ? '免费组建推广团队' : 'Build My Launch Team'}
          </Link>

          <p className="animate-fade-in-up delay-400 mx-auto mt-4 max-w-2xl text-xs leading-6 text-zinc-400 motion-reduce:animate-none sm:mt-5 sm:text-sm">
            {isZh
              ? '优先自然增长 · 不靠广告预算 · 专为独立开发者和一人公司打造'
              : 'Organic-first · No ad budget or agency required · Built for solo founders and indie makers'}
          </p>
        </div>

        <HeroChannelMarquee isZh={isZh} />
      </div>
    </section>
  );
}

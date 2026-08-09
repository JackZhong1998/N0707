import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import HeroChannelMarquee from '@/components/landing/HeroChannelMarquee';
import { LogoLetterB } from '@/components/Logo';

function AgentTeamIcon() {
  return (
    <span className="relative flex h-5 w-8 shrink-0 items-center" aria-hidden="true">
      <span className="absolute left-0 h-4 w-4 rounded-full border border-zinc-500 bg-night-panel" />
      <span className="absolute left-2 h-4 w-4 rounded-full border border-zinc-500 bg-night-panel" />
      <span className="absolute left-4 h-4 w-4 rounded-full border border-zinc-500 bg-night-panel" />
    </span>
  );
}

function CapabilityBadges({ isZh }: { isZh: boolean }) {
  return (
    <div className="hero-capability-strip animate-fade-in-up delay-400 mx-auto mt-5 motion-reduce:animate-none sm:mt-6">
      <div className="hero-capability-item">
        <AgentTeamIcon />
        <span>{isZh ? 'AI 营销 Agent Team' : 'AI Marketing Agent Team'}</span>
      </div>

      <div className="hero-capability-item">
        <span className="font-mono text-xs text-zinc-500" aria-hidden="true">
          &gt;_
        </span>
        <span>{isZh ? '28+ 渠道 Skills' : '28+ Channel Skills'}</span>
      </div>

      <div className="hero-capability-item">
        <span className="text-zinc-500" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
          </svg>
        </span>
        <span>{isZh ? '海外产品收录' : 'Launch Directories'}</span>
      </div>

      <div className="hero-capability-item">
        <span className="text-zinc-500" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M5 12h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>{isZh ? '自动化执行' : 'Automated Execution'}</span>
      </div>
    </div>
  );
}

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

      <div className="relative pb-12 pt-24 sm:pb-14 sm:pt-28">
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
          <p className="animate-fade-in font-mono text-xs font-medium uppercase tracking-[0.2em] text-brand-300 motion-reduce:animate-none">
            {isZh
              ? '为独立开发者而设的 AI 营销 AGENT TEAM'
              : 'AI MARKETING AGENT TEAM FOR SOLO FOUNDERS'}
          </p>

          <h1 className="animate-fade-in-up delay-100 mx-auto mt-5 max-w-6xl font-[family-name:var(--font-display)] text-[2.8rem] font-bold leading-[1.08] tracking-[-0.06em] text-white sm:mt-7 sm:text-7xl sm:leading-[0.93] lg:text-[6.25rem] motion-reduce:animate-none">
            <span className="block">
              {isZh ? '产品已经上线。' : 'You built the product.'}
            </span>
            <span className="mt-2 block text-brand-300">
              {isZh ? (
                '接下来，让市场看见它。'
              ) : (
                <span>
                  <span>Now </span>
                  <span
                    className="inline-flex items-baseline whitespace-nowrap"
                  >
                    <span className="sr-only">B</span>
                    <LogoLetterB className="mr-[0.015em] inline-block h-[0.72em] w-[0.84em] shrink-0 translate-y-[0.02em]" />
                    <span>uild</span>
                  </span>
                  <span> the market.</span>
                </span>
              )}
            </span>
          </h1>

          <p className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-[58rem] text-sm leading-7 text-zinc-300 sm:mt-8 sm:text-lg sm:leading-8 lg:text-xl motion-reduce:animate-none">
            {isZh ? (
              <>
                不会做市场增长，也不知道需求是否真实？
                <strong className="font-semibold text-brand-300">AI 营销 Agent Team</strong>
                {' 调用 '}
                <strong className="hero-skill-inline">28+ 渠道 Skills</strong>
                ，自动研究、选题、创作、发布，并向海外产品收录站提交产品，用真实反馈帮你验证市场。
              </>
            ) : (
              <>
                Not sure how to grow—or whether the market really wants it? Your{' '}
                <strong className="font-semibold text-brand-300">AI Marketing Agent Team</strong>
                {' uses '}
                <strong className="hero-skill-inline">28+ Channel Skills</strong>
                {' to research, create, publish, and distribute—turning real feedback into market validation.'}
              </>
            )}
          </p>

          <Link
            href="/sign-in"
            className="animate-fade-in-up delay-300 mt-7 inline-flex h-14 items-center justify-center rounded-full bg-white px-10 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_40px_rgba(213,250,123,0.08)] transition hover:-translate-y-0.5 hover:bg-brand-300 motion-reduce:animate-none sm:mt-9 sm:text-base"
          >
            {isZh ? '免费分析我的产品' : 'Analyze My Product Free'}
          </Link>

          <CapabilityBadges isZh={isZh} />
        </div>

        <HeroChannelMarquee isZh={isZh} />
      </div>
    </section>
  );
}

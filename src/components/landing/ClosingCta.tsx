import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BRAND_MISSION, BRAND_MISSION_ZH } from '@/lib/brand';

export default async function ClosingCta() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  return (
    <section className="bg-white px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-[1500px] rounded-[2rem] bg-night px-5 py-24 text-center sm:px-12 sm:py-32">
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-brand-300">{isZh ? BRAND_MISSION_ZH : BRAND_MISSION}</p>
        <h2 className="display-tight mx-auto mt-6 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
          {isZh ? <>产品已经准备好了。<br />现在，认真把它推向市场。</> : <>Your product is ready.<br />Put launch team to work.</>}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          {isZh
            ? '先免费生成一份冷启动简报，看看团队如何理解你的产品、市场和优先渠道。方向对了，再开启完整的 30 天计划。'
            : 'Start with a free Launch Brief to see how the team understands your product, market, and priority channels. Activate the full 30 days when you are ready.'}
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/sign-up"
            className="inline-flex h-13 items-center rounded-full bg-white px-9 text-[15px] font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '免费开始规划' : 'Build My Launch Team'}
          </Link>
        </div>
      </div>
    </section>
  );
}

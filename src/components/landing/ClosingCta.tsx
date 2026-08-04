import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const highlightClass = 'inline bg-brand-500 px-[0.09em] text-black [-webkit-box-decoration-break:clone] [box-decoration-break:clone]';

export default async function ClosingCta() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  return (
    <section className="bg-white px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="relative mx-auto flex min-h-[82svh] max-w-[1500px] items-center overflow-hidden rounded-[2rem] bg-night px-5 py-20 text-center sm:px-12 sm:py-28">
        <div className="bg-grid-dark absolute inset-0 opacity-50" aria-hidden />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.06] blur-[150px]" aria-hidden />

        <div className="relative mx-auto w-full max-w-7xl">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-brand-300 sm:text-xs">
            BUILD YOUR PRODUCT. BUILD YOUR MARKET. BUILD YOUR BUSINESS.
          </p>

          <h2 className="mx-auto mt-8 font-[family-name:var(--font-display)] text-[2.35rem] font-bold leading-[1.04] tracking-[-0.06em] text-white sm:text-6xl lg:text-[5rem]">
            {isZh ? (
              <>
                <span className="block">产品已经上线。</span>
                <span className="mt-1 block">现在，让 <span className={highlightClass}>AI Marketing Agent</span></span>
                <span className="mt-1 block"><span className={highlightClass}>Team</span> 开始工作。</span>
              </>
            ) : (
              <>
                <span className="block">Your product is live.</span>
                <span className="mt-1 block">Put your <span className={highlightClass}>AI Marketing Agent</span></span>
                <span className="mt-1 block"><span className={highlightClass}>Team</span> to work.</span>
              </>
            )}
          </h2>

          <p className="mx-auto mt-9 max-w-4xl text-base leading-8 text-zinc-400 sm:text-xl sm:leading-9">
            {isZh
              ? '先免费让 Agent 分析你的产品、用户与市场方向。确认它真正读懂以后，再决定是否组建完整团队。'
              : 'Start with a free analysis of your product, users, and market direction. Once the Agents prove they understand it, decide whether to assemble the full team.'}
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/sign-in"
              className="inline-flex h-16 items-center rounded-full bg-white px-11 text-base font-semibold text-black transition hover:-translate-y-0.5 hover:bg-brand-300"
            >
              {isZh ? '免费分析我的产品' : 'Analyze My Product Free'}
            </Link>
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            {isZh ? '无需信用卡 · 先看分析结果 · 确认后再开启自动化执行' : 'No credit card · See the analysis first · Automate only when ready'}
          </p>
        </div>
      </div>
    </section>
  );
}

import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function FlowSteps() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const steps = isZh
    ? [
        { n: '1', t: '输入产品网址', d: 'Agent 读取官网并建立产品档案，再向你确认目标用户、市场、语气和 30 天目标。' },
        { n: '2', t: '免费查看冷启动方向', d: '先看到产品理解、推荐渠道、Campaign 阶段、前 7 天日历、10 个目录和 1 篇完整内容。' },
        { n: '3', t: '启动完整 30 天 Campaign', d: '确认 Agent 真正理解产品后再付费。适合的渠道团队会共享同一份产品记忆和策略。' },
        { n: '4', t: '每天执行，每周调整', d: 'Agent 准备内容与发布资料；你审核外部操作。每周再用公开表现和执行结果调整后续工作。' },
      ]
    : [
        { n: '1', t: 'Enter the product URL', d: 'Agents read the site, build a product profile, and confirm only what is missing: audience, market, voice, and the 30-day goal.' },
        { n: '2', t: 'Preview the launch direction free', d: 'See the product understanding, recommended channels, campaign phases, first 7 days, 10 directories, and one complete draft.' },
        { n: '3', t: 'Start the full 30-day campaign', d: 'Pay only after the team demonstrates that it understands the product. The selected agents share one memory and strategy.' },
        { n: '4', t: 'Execute daily and adjust weekly', d: 'Agents prepare content and publishing materials; you approve external actions. Weekly reviews update what comes next.' },
      ];

  return (
    <section id="how-it-works" className="scroll-mt-16 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="max-w-3xl">
          <p className="index-label">{isZh ? '先证明理解，再为完整执行付费' : 'See understanding before paying for execution'}</p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">
            {isZh ? '从一个网址，到一套每天都能推进的 Campaign。' : 'From one URL to a campaign that moves every day.'}
          </h2>
        </div>

        <div className="mt-14 grid gap-3 md:grid-cols-4">
          {steps.map((step) => (
            <article key={step.n} className="rounded-[1.75rem] bg-paper-dim p-7">
              <span className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tighter text-zinc-200">{step.n}</span>
              <h3 className="mt-6 text-lg font-semibold text-ink">{step.t}</h3>
              <p className="mt-3 text-sm leading-7 text-ink-muted">{step.d}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-3xl border border-zinc-200 bg-paper-dim p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-base font-bold text-ink">{isZh ? '想先看完整产品体验？' : 'Want the complete product walkthrough first?'}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {isZh
                ? '查看从产品研究、Campaign Blueprint、渠道计划到每日交付和每周复盘的完整流程。'
                : 'Walk through product research, the campaign blueprint, channel plans, daily deliverables, and weekly reviews.'}
            </p>
          </div>
          <Link href="/30-day-campaign" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-zinc-800">
            {isZh ? '查看 30 天产品体验 →' : 'Explore the 30-day experience →'}
          </Link>
        </div>
      </div>
    </section>
  );
}

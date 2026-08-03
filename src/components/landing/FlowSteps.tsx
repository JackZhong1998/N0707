import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function FlowSteps() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const steps = isZh
    ? [
        { n: '1', t: '导入项目文档', d: '把 Prompt 交给常用 Coding / AI 平台，再将生成的项目文档粘贴回来；也可以选择分析产品网址。' },
        { n: '2', t: '免费获得完整策略报告', d: '查看产品启动判断、推荐渠道与理由、Day 1–30 发布排期和 Directory 提交计划。' },
        { n: '3', t: '组建 Launch Agent Team', d: '看完报告再付费。团队会把策略拆成逐日内容、Todo、发布材料和个性化 Directory 提交。' },
        { n: '4', t: '每天执行，每周调整', d: 'Agent 准备内容与发布资料；你审核外部操作。每周再用公开表现和执行结果调整后续工作。' },
      ]
    : [
        { n: '1', t: 'Import a project document', d: 'Run our prompt in your coding/AI platform and paste the document back—or choose public website analysis.' },
        { n: '2', t: 'Get the complete strategy report free', d: 'See the launch diagnosis, channel rationale, Day 1–30 publishing schedule, and directory submission plan.' },
        { n: '3', t: 'Assemble Launch Agent Team', d: 'Pay only after reading the report. The team turns strategy into daily content, tasks, publishing assets, and personalized directory submissions.' },
        { n: '4', t: 'Execute daily and adjust weekly', d: 'Agents prepare content and publishing materials; you approve external actions. Weekly reviews update what comes next.' },
      ];

  return (
    <section id="how-it-works" className="scroll-mt-16 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="max-w-3xl">
          <p className="index-label">{isZh ? '先证明理解，再为完整执行付费' : 'See understanding before paying for execution'}</p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">
            {isZh ? '从项目文档，到一套每天都能推进的 Campaign。' : 'From a project document to a campaign that moves every day.'}
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

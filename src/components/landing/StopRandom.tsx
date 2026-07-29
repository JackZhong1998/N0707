import { getLocale } from 'next-intl/server';

const OUTCOMES_ZH = [
  {
    day: 'DAY 01',
    title: '先把方向想明白',
    description: '团队读懂产品、用户与竞品，把零散信息整理成清晰的市场判断，并定下 30 天目标、传播主线和优先渠道。',
    proof: '产品档案 · 市场判断 · 30 天推广蓝图',
  },
  {
    day: 'DAY 07',
    title: '让第一批内容走向市场',
    description: '不同渠道按各自的表达习惯准备内容。你负责审核和发布，真实反馈随即进入下一轮计划。',
    proof: '每日内容 · 发布记录 · 第一轮反馈',
  },
  {
    day: 'DAY 30',
    title: '知道下一步该往哪里走',
    description: '渠道表现、内容资产、目录进度和复盘结论都沉淀下来。下个月继续什么、放弃什么，不再只凭感觉。',
    proof: '渠道结论 · 市场信号 · 下一轮建议',
  },
];

const OUTCOMES_EN = [
  {
    day: 'DAY 01',
    title: 'Start with a market direction',
    description: 'The team reads your product, audience, and competitors, then turns them into shared memory, a 30-day goal, one message, and clear channel priorities.',
    proof: 'Product profile · market judgment · launch blueprint',
  },
  {
    day: 'DAY 07',
    title: 'Put real work into the market',
    description: 'Channel agents prepare platform-native content and launch tasks. You review, publish, and feed the first real reactions into the next plan.',
    proof: 'Daily deliverables · publishing record · first signals',
  },
  {
    day: 'DAY 30',
    title: 'Know what deserves the next month',
    description: 'Your channel record, reusable assets, directory status, and review findings turn the next decision into evidence—not another guess.',
    proof: 'Channel findings · PMF signals · next campaign',
  },
];

export default async function StopRandom() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const outcomes = isZh ? OUTCOMES_ZH : OUTCOMES_EN;

  return (
    <section id="outcomes" className="scroll-mt-16 bg-canvas-warm">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="index-label">{isZh ? '这 30 天会发生什么' : 'What 30 days builds'}</p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
            {isZh ? (
              <>从产品上线，<br className="hidden sm:block" />到市场真正开始回应。</>
            ) : (
              <>From a finished product<br className="hidden sm:block" />to a launch that moves every day.</>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-ink-muted sm:text-lg">
            {isZh
              ? '只需一个产品网址，NowBuild 就能为你梳理推广策略、安排每日行动，并从真实反馈里找出值得继续的方向。'
              : 'NowBuild turns one product URL into a shared launch strategy, daily channel-native work, early PMF signals, and a clear next move.'}
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-3 lg:grid-cols-3">
          {outcomes.map((outcome, index) => (
            <article key={outcome.day} className="flex h-full flex-col rounded-[1.75rem] bg-white p-7 sm:p-8">
              <span className={`flex h-8 w-fit items-center rounded-full px-4 font-mono text-[10px] font-semibold tracking-[.16em] ${index === 2 ? 'bg-ink text-brand-300' : 'bg-brand-50 text-brand-800'}`}>
                {outcome.day}
              </span>
              <h3 className="mt-8 text-2xl font-semibold leading-8 text-ink">{outcome.title}</h3>
              <p className="mt-4 text-sm leading-7 text-ink-muted">{outcome.description}</p>
              <p className="mt-auto pt-8 text-xs font-semibold leading-5 text-ink">{outcome.proof}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

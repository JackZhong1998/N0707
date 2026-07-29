import { getLocale } from 'next-intl/server';

export default async function Comparison() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const agentWork = isZh
    ? ['研究产品、用户、竞品和可行渠道', '制定 30 天计划、行动日历和内容主线', '准备社交媒体、社区、视频、SEO 和产品分发内容', '记录执行进度，每周根据反馈调整方向']
    : ['Research the product, audience, competitors, and channels', 'Build the campaign, calendar, and connected message', 'Prepare social, community, video, SEO, and distribution work', 'Track execution and produce weekly reviews'];

  const founderWork = isZh
    ? ['确认产品事实和关键判断', '审核将以你的名义发布的内容', '完成账号登录和最终发布', '与真实用户交流，把一手反馈带回来']
    : ['Confirm product facts and key judgments', 'Review content published in your name', 'Complete account access and final publishing', 'Talk with real users and return feedback to the agents'];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="index-label">{isZh ? '你不必一个人扛下所有事' : 'Stop doing every launch task alone'}</p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">
            {isZh ? <>繁琐的交给团队，<br />关键的仍由你决定。</> : <>The team does the launch work.<br />You make the founder decisions.</>}
          </h2>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-[2rem] border border-zinc-200 lg:grid-cols-2">
          <article className="bg-ink p-8 text-white sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-300">{isZh ? '智能团队负责' : 'The launch team handles'}</p>
            <h3 className="mt-4 text-2xl font-semibold">{isZh ? '准备内容，协调节奏，持续推进' : 'Preparation, coordination, and momentum'}</h3>
            <ul className="mt-8 space-y-4">
              {agentWork.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-300"><span className="text-emerald-400">✓</span>{item}</li>)}
            </ul>
          </article>
          <article className="bg-white p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">{isZh ? '你负责' : 'You stay responsible for'}</p>
            <h3 className="mt-4 text-2xl font-semibold text-ink">{isZh ? '做判断，建关系，拍板决定' : 'Judgment, relationships, and final decisions'}</h3>
            <ul className="mt-8 space-y-4">
              {founderWork.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-ink-muted"><span className="text-brand-700">→</span>{item}</li>)}
            </ul>
          </article>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
          {isZh
            ? 'NowBuild 不保存第三方平台密码；平台审核、搜索排名、流量和增长结果，也不会做不切实际的承诺。'
            : 'NowBuild does not store platform passwords or guarantee third-party approval, rankings, traffic, or growth.'}
        </p>
      </div>
    </section>
  );
}

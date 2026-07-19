import { getLocale } from 'next-intl/server';

/** 用户体验流程 — 瑞士编目式编号排版 */
export default async function FlowSteps() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const steps = isZh
    ? [
        { n: '1', t: '说清楚你在做什么', d: '聊几句：产品、人群、市场。标准问题点选项就行，不用写小作文。' },
        { n: '2', t: '拿到 30 天市场策略', d: '每个渠道怎么打、发什么内容，方向清清楚楚。不满意，随时改。' },
        { n: '3', t: '打开行动日历', d: '30 天每天要做的事已经排好，要发的内容也写好了初稿。' },
        { n: '4', t: '判断、发布、打勾', d: '用你的品味过一遍稿，一键跳到发布页；发完回来打个勾。' },
      ]
    : [
        { n: '1', t: 'Say what you’re building', d: 'A short chat: product, audience, market. Standard questions are just clicks.' },
        { n: '2', t: 'Get your 30-day strategy', d: 'How to play each channel and what to post. Not happy? Change it anytime.' },
        { n: '3', t: 'Open your action calendar', d: 'Every day of the next 30 days is scheduled, with drafts already written.' },
        { n: '4', t: 'Judge, publish, check off', d: 'Apply your taste, jump to the publish page, come back and tick it done.' },
      ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="index-label">{isZh ? '流程' : 'The flow'}</p>
        <h2 className="mt-4 max-w-lg font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {isZh ? '从想法到行动，只隔一次对话' : 'From idea to action — one conversation away.'}
        </h2>

        <div className="mt-14 grid gap-3 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl bg-paper-dim p-7">
              <span className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tighter text-zinc-200">
                {s.n}
              </span>
              <h3 className="mt-6 text-base font-semibold text-ink">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { getLocale } from 'next-intl/server';

/** 用户体验流程 — 瑞士编目式编号排版 */
export default async function FlowSteps() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const steps = isZh
    ? [
        { n: '1', t: '和市场总监聊聊', d: '它会弄清你的产品、人群与价值，问该问的问题，不多不少。' },
        { n: '2', t: '拿到 30 天市场策略', d: '总体方向 + 每个渠道的账号定位与内容规划，可以继续提意见修改。' },
        { n: '3', t: '打开你的行动日历', d: '渠道专员把 30 天每天要做的事排好，内容初稿都已备好。' },
        { n: '4', t: '过稿、发布、复盘', d: '不满意就和渠道专员对话改稿；满意就一键跳转到渠道发布页。' },
      ]
    : [
        { n: '1', t: 'Talk to your director', d: 'It learns your product, audience and value — asking exactly what it needs.' },
        { n: '2', t: 'Get your 30-day strategy', d: 'Overall direction plus per-channel positioning and content pillars. Editable.' },
        { n: '3', t: 'Open your action calendar', d: 'Channel specialists schedule every day of the next 30 days, drafts included.' },
        { n: '4', t: 'Review, publish, repeat', d: 'Chat with the specialist to revise, then jump straight to the publish page.' },
      ];

  return (
    <section className="border-t border-hairline bg-paper-dim">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="index-label">{isZh ? '流程' : 'The flow'}</p>
        <h2 className="mt-4 max-w-lg font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {isZh ? '从对话到发布，30 天不断更' : 'From conversation to publish. 30 days, no gaps.'}
        </h2>

        <div className="mt-14 grid gap-px border border-hairline bg-hairline md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="bg-white p-7">
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

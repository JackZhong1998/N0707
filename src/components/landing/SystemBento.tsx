import { getLocale } from 'next-intl/server';

/** 三个 Agent + 日历 — 瑞士网格 / Bento 模块化分区 */
export default async function SystemBento() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const agents = [
    {
      index: '01',
      title: isZh ? '市场总监' : 'Marketing Director',
      subtitle: 'Main Agent',
      desc: isZh
        ? '通过对话弄清你的产品、人群与核心价值。标准化问题用选项卡片，深度问题用文字问答。信息足够时，它调用策略与渠道专员，带着你 go to market。'
        : 'Learns your product, audience and core value through conversation, then dispatches the strategist and channel specialists — walking you to market.',
    },
    {
      index: '02',
      title: isZh ? '策略生成 Agent' : 'Strategy Agent',
      subtitle: 'Sub-Agent',
      desc: isZh
        ? '精通各渠道 GTM 方法论。产出 30 天冷启动计划：总体方向、每个渠道的账号定位与内容规划。支持你继续提意见修改。'
        : 'Masters channel GTM playbooks. Produces your 30-day cold-start plan: direction, account positioning and content pillars per channel.',
    },
    {
      index: '03',
      title: isZh ? '上下文管理 Agent' : 'Context Agent',
      subtitle: 'Context Agent',
      desc: isZh
        ? '把散乱的对话总结成两份档案：你的个人档案与项目档案，随对话不断累积，嵌入每一个 Agent 的上下文。'
        : 'Distills scattered conversation into two living dossiers — you, and your project — embedded into every agent.',
    },
    {
      index: '04',
      title: isZh ? '渠道专员 Agent' : 'Channel Specialists',
      subtitle: 'Executors',
      desc: isZh
        ? '每个渠道一位专员，全程佩戴渠道 Skill。编写 30 天每日 To-Do，用你的口吻写出「有人味」的内容，并在详情页随叫随改。'
        : 'One specialist per channel, wearing its skill full-time. Writes your daily to-dos and human-sounding copy in your own voice.',
    },
  ];

  return (
    <section id="system" className="border-t border-hairline bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="index-label">{isZh ? '系统' : 'The system'}</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {isZh ? '四个 Agent，一支市场部' : 'Four agents. One marketing team.'}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              {isZh
                ? '你负责做产品，剩下的交给它们：对话、策略、总结、执行 — 一个完整的冷启动市场系统。'
                : 'You build the product. They handle the rest: conversation, strategy, memory and execution — a complete cold-start marketing system.'}
            </p>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
              {agents.map((a) => (
                <div key={a.index} className="bg-white p-7 sm:p-8">
                  <div className="flex items-baseline justify-between">
                    <span className="index-label">{a.index}</span>
                    <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-300">
                      {a.subtitle}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{a.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

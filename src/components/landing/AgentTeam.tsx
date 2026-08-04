import { getLocale } from 'next-intl/server';

const AGENTS_ZH = [
  { code: 'MR', name: 'Market Research Agent', job: '读懂产品、用户、竞品和市场', output: '用户问题 · 竞品差异 · 需求信号' },
  { code: 'GS', name: 'Growth Strategy Agent', job: '将想法变成可验证的市场假设', output: '定位 · 验证路径 · 30 天 Campaign' },
  { code: 'CO', name: 'Content Agent', job: '把市场假设变成持续选题与内容', output: '选题 · 文案 · 视频与视觉 Brief' },
  { code: 'CH', name: 'Channel Agents', job: '调用平台专属 Skills 执行渠道工作', output: '平台原生内容 · 互动 · 发布' },
  { code: 'SE', name: 'SEO Agent', job: '发现搜索需求，积累长期可发现性', output: '关键词 · 内容集群 · 落地页' },
  { code: 'DI', name: 'Directory Agent', job: '匹配产品目录并执行支持的提交', output: '目录排名 · 提交材料 · 进度' },
  { code: 'RE', name: 'Review Agent', job: '读取执行和市场反馈，调整下一步', output: '周复盘 · 市场信号 · 调整建议' },
];

const AGENTS_EN = [
  { code: 'MR', name: 'Market Research Agent', job: 'Understands the product, audience, competitors, and market', output: 'User problems · gaps · demand signals' },
  { code: 'GS', name: 'Growth Strategy Agent', job: 'Turns ideas into market hypotheses you can validate', output: 'Positioning · validation path · campaign' },
  { code: 'CO', name: 'Content Agent', job: 'Turns hypotheses into a sustained content direction', output: 'Topics · copy · video & visual briefs' },
  { code: 'CH', name: 'Channel Agents', job: 'Call platform-native Skills to execute channel work', output: 'Native content · engagement · publishing' },
  { code: 'SE', name: 'SEO Agent', job: 'Finds search demand and compounds discoverability', output: 'Keywords · content clusters · landing pages' },
  { code: 'DI', name: 'Directory Agent', job: 'Matches directories and runs supported submissions', output: 'Directory fit · materials · progress' },
  { code: 'RE', name: 'Review Agent', job: 'Reads execution and market feedback to adjust the plan', output: 'Weekly review · signals · next moves' },
];

const AGENT_AVATARS: Record<string, string> = {
  MR: 'https://koboyo.com/icons/svg/researcher.svg',
  GS: 'https://koboyo.com/icons/svg/consultant-presenting.svg',
  CO: 'https://koboyo.com/icons/svg/copywriter.svg',
  CH: 'https://koboyo.com/icons/svg/marketer.svg',
  SE: 'https://koboyo.com/icons/svg/data-analyst.svg',
  DI: 'https://koboyo.com/icons/svg/accountant.svg',
  RE: 'https://koboyo.com/icons/svg/editor.svg',
};

export default async function AgentTeam() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const agents = isZh ? AGENTS_ZH : AGENTS_EN;

  return (
    <section id="agent-team" className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-night text-white">
      <div className="bg-grid-dark absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_.78fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-brand-300">
              {isZh ? '你的 AI 营销 AGENT TEAM' : 'YOUR AI MARKETING AGENT TEAM'}
            </p>
            <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.08] tracking-[-0.05em] sm:text-5xl lg:text-[3.3rem]">
              {isZh ? <>不是一个 AI 助手。<br />是一支真正分工协作的营销团队。</> : <>Not one AI assistant.<br />A marketing team that works together.</>}
            </h2>
          </div>
          <p className="max-w-xl text-base leading-8 text-zinc-400 lg:justify-self-end">
            {isZh
              ? '把产品讲清楚一次，所有 Agent 共享同一份产品认知，围绕同一个市场假设分工，并实时同步真实反馈。'
              : 'Explain the product once. Every Agent shares the same product memory, divides the work around one market hypothesis, and keeps real feedback in sync.'}
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/12 bg-white/[0.025] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.25)] sm:p-5">
          <div className="grid gap-4 rounded-[1.25rem] border border-white/10 bg-black/25 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6">
            <div className="flex -space-x-2" aria-hidden="true">
              {agents.slice(0, 4).map((agent) => (
                <span key={agent.code} className="flex h-10 w-10 items-end justify-center overflow-hidden rounded-full border-2 border-night bg-zinc-800 p-1.5 text-white">
                  <img src={AGENT_AVATARS[agent.code]} alt="" className="h-full w-full object-contain invert" />
                </span>
              ))}
            </div>
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[.16em] text-brand-300">{isZh ? '共享产品认知' : 'SHARED PRODUCT MEMORY'}</p>
              <h3 className="mt-1 text-base font-bold text-white">{isZh ? '产品认知 / 市场假设' : 'Product Memory / Market Hypothesis'}</h3>
            </div>
            <p className="text-[10px] leading-5 text-zinc-500 sm:max-w-[250px] sm:text-right">{isZh ? '事实、定位、语气、目标和最新反馈实时同步' : 'Facts, positioning, voice, goals, and feedback stay in sync'}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => <AgentCard key={agent.code} agent={agent} />)}
          </div>

          <p className="mt-3 px-3 pb-1 text-center font-mono text-[9px] uppercase tracking-[.14em] text-zinc-500">
            {isZh ? '一份产品认知 · 一个市场假设 · 一场 30 天 CAMPAIGN' : 'ONE PRODUCT MEMORY · ONE MARKET HYPOTHESIS · ONE 30-DAY CAMPAIGN'}
          </p>
        </div>
      </div>
    </section>
  );
}

function AgentCard({ agent }: { agent: typeof AGENTS_ZH[number] }) {
  return (
    <article className="group min-h-[168px] rounded-[1.25rem] border border-white/10 bg-night-panel/75 p-4 transition-colors hover:border-brand-300/35 hover:bg-night-elevated/75">
      <div className="flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-full border border-white/12 bg-zinc-800 p-2 text-white">
          <img src={AGENT_AVATARS[agent.code]} alt="" className="h-full w-full object-contain invert" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 text-white">{agent.name}</h3>
          <p className="mt-1.5 text-xs leading-5 text-zinc-400">{agent.job}</p>
        </div>
      </div>
      <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[9px] leading-4 tracking-[.03em] text-zinc-500">{agent.output}</p>
    </article>
  );
}

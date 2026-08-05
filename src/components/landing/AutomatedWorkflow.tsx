import { getLocale } from 'next-intl/server';

const STEPS_ZH = [
  {
    number: '01',
    label: 'RESEARCH',
    status: '正在分析',
    title: '先搞清楚要验证什么',
    description: 'Research 与 Strategy Agents 读取产品、用户和竞品，形成可修正的市场假设。',
  },
  {
    number: '02',
    label: 'PLAN',
    status: '计划已就绪',
    title: '把假设拆成 30 天行动',
    description: 'Growth Strategy Agent 设定优先渠道、内容主线、发布节奏和需要观察的市场信号。',
  },
  {
    number: '03',
    label: 'EXECUTE',
    status: 'Agents 执行中',
    title: 'Agents 调用 Skills 自动执行',
    description: '系统按日历自动选题、创作内容、准备发布材料，经你确认后发布；Directory Agent 同步匹配并提交产品目录。',
    featured: true,
  },
  {
    number: '04',
    label: 'LEARN',
    status: '正在学习',
    title: '让真实反馈改变下一步',
    description: 'Review Agent 汇总发布、互动、访谈和执行信号，判断什么值得加码、什么需要调整。',
  },
];

const STEPS_EN = [
  {
    number: '01',
    label: 'RESEARCH',
    status: 'Analyzing',
    title: 'Define what needs validation',
    description: 'Research and Strategy Agents read your product, audience, and competitors to form a market hypothesis that can change with evidence.',
  },
  {
    number: '02',
    label: 'PLAN',
    status: 'Plan ready',
    title: 'Turn the hypothesis into 30 days of action',
    description: 'The Growth Strategy Agent sets channel priorities, content themes, publishing cadence, and the market signals worth watching.',
  },
  {
    number: '03',
    label: 'EXECUTE',
    status: 'Agents working',
    title: 'Agents call Skills and move the work forward',
    description: 'The system researches topics, creates content, and prepares publishing work for your approval while the Directory Agent matches and submits listings.',
    featured: true,
  },
  {
    number: '04',
    label: 'LEARN',
    status: 'Learning',
    title: 'Let real feedback change the next move',
    description: 'The Review Agent combines publishing, engagement, interviews, and execution signals to decide what to double down on and what to adjust.',
  },
];

const ACTIVITY_ZH = [
  'Research Agent 已完成竞品扫描',
  'Strategy Agent 已更新市场假设',
  'Reddit Skill 已准备社区原生草稿',
  'Directory Agent 已提交 AlternativeTo',
];

const ACTIVITY_EN = [
  'Research Agent finished competitor scan',
  'Strategy Agent updated market hypothesis',
  'Reddit Skill prepared a native discussion draft',
  'Directory Agent submitted AlternativeTo',
];

export default async function AutomatedWorkflow() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const steps = isZh ? STEPS_ZH : STEPS_EN;
  const activity = isZh ? ACTIVITY_ZH : ACTIVITY_EN;

  return (
    <section id="workflow" className="relative scroll-mt-16 overflow-hidden bg-night text-white">
      <div className="bg-grid-dark absolute inset-0 opacity-45" aria-hidden />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.06] blur-[120px]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-brand-300">
            {isZh ? '从市场假设到每日执行' : 'FROM MARKET HYPOTHESIS TO DAILY EXECUTION'}
          </p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.15] tracking-[-0.045em] sm:text-5xl sm:leading-[1.05]">
            {isZh ? <>不只给你建议。<br />Agent Team 会把每一步真正推进下去。</> : <>Not another list of advice.<br />The Agent Team moves every step forward.</>}
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-400">
            {isZh
              ? '从读懂产品、建立市场假设，到自动选题、创作、准备发布、提交 Directories 和每周调整，所有工作都连在同一场 Campaign 里。'
              : 'From understanding the product and framing a market hypothesis to creating, preparing publication, submitting directories, and learning every week, the whole system runs as one campaign.'}
          </p>
        </div>

        <div className="relative mt-14 grid gap-3 lg:grid-cols-4">
          {steps.map((step) => (
            <article
              key={step.number}
              className={`relative flex min-h-[320px] flex-col rounded-[1.5rem] border p-6 ${step.featured ? 'border-brand-300/60 bg-brand-300 text-black shadow-[0_20px_80px_rgba(213,250,123,0.10)]' : 'border-white/10 bg-white/[0.045]'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`flex h-14 w-14 items-center justify-center rounded-full border font-mono text-xs font-semibold ${step.featured ? 'border-black/15 bg-black text-brand-300' : 'border-white/15 bg-night'}`}>
                  {step.number}
                </span>
                <span className={`rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.12em] ${step.featured ? 'bg-black/10 text-black/65' : 'bg-white/[0.06] text-zinc-400'}`}>
                  <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${step.featured ? 'bg-black' : 'animate-pulse-soft bg-brand-300'}`} />
                  {step.status}
                </span>
              </div>
              <p className={`mt-8 font-mono text-[10px] tracking-[.16em] ${step.featured ? 'text-black/55' : 'text-brand-300'}`}>{step.label}</p>
              <h3 className="mt-3 text-xl font-semibold leading-7">{step.title}</h3>
              <p className={`mt-4 text-sm leading-7 ${step.featured ? 'text-black/70' : 'text-zinc-400'}`}>{step.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/35">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-300" aria-hidden />
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">LIVE AGENT ACTIVITY</p>
          </div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {activity.map((item, index) => (
              <p key={item} className="bg-night px-5 py-4 text-xs leading-5 text-zinc-400">
                <span className="mr-2 font-mono text-brand-300">0{index + 1}</span>{item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { getLocale } from 'next-intl/server';

const ROLES_ZH = ['市场策略', '内容创作', '社区运营', '搜索增长', '产品分发'];
const ROLES_EN = ['Market strategy', 'Content', 'Community', 'SEO', 'Distribution'];

export default async function AgentTeam() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const roles = isZh ? ROLES_ZH : ROLES_EN;

  return (
    <section id="agent-team" className="relative overflow-hidden bg-night text-white">
      <div className="bg-grid-dark absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[.84fr_1.16fr] lg:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-brand-300">
              {isZh ? '一支真正协同的推广团队' : 'Meet your launch team'}
            </p>
            <h2 className="mt-5 max-w-xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.15] tracking-[-0.045em] text-white sm:text-5xl sm:leading-[1.05]">
              {isZh
                ? <>你只需说一次，<br />整支团队都能听懂。</>
                : <>One conversation.<br />A whole team behind it.</>}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-400">
              {isZh
                ? '产品定位、品牌语气和本轮目标，只需交代一次。市场合伙人会协调各领域的智能专员，让所有工作都基于同一份产品认知。'
                : 'Explain your product position, voice, and campaign goal once. Your Market Partner coordinates specialist agents working from the same product memory.'}
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.045] shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="grid gap-5 bg-brand-300 px-6 py-6 text-black sm:grid-cols-[auto_1fr] sm:items-center sm:px-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black font-mono text-xs font-bold text-brand-300">
                MP
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-black/55">
                  {isZh ? '市场合伙人' : 'Market Partner'}
                </p>
                <h3 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
                  {isZh ? '理解你的想法，也把每件事推进到底。' : 'Takes your brief and coordinates the work.'}
                </h3>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {roles.map((role) => (
                  <span key={role} className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-300" aria-hidden />
                    {role}
                  </span>
                ))}
              </div>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">
                  {isZh ? '全团队共享的产品认知' : 'Shared product memory'}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {isZh
                    ? '产品事实、定位、语气、目标和市场反馈实时同步，所有内容都服务于同一个 30 天目标。'
                    : 'Facts, positioning, voice, goals, and market feedback stay in sync across one 30-day plan.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

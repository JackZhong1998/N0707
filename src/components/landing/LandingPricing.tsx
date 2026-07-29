import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CONFIGURED_DIRECTORY_COUNT } from '@/lib/directories/automation';

export default async function LandingPricing() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  const gains = isZh
    ? [
        {
          n: '01',
          title: '把时间留给判断',
          detail: '选题、初稿、素材说明和目录提交都提前准备好；你每天只需用约 30 分钟审核、修改和确认。',
        },
        {
          n: '02',
          title: '每天都有明确下一步',
          detail: '30 天推广策略和行动日历已经排好，不必每天重猜选题、渠道和优先级。',
        },
        {
          n: '03',
          title: '产品背景只说一次',
          detail: '所有智能专员共享产品事实、市场定位、品牌语气、本轮目标和最新反馈。',
        },
        {
          n: '04',
          title: '让反馈成为方向',
          detail: '发布记录、每周复盘和早期市场信号，会告诉你什么值得加码、什么应该停下。',
        },
      ]
    : [
        {
          n: '01',
          title: 'Save hours every day',
          detail: 'Stop planning content, preparing assets, and submitting directories yourself. Spend about 30 minutes reviewing and approving.',
        },
        {
          n: '02',
          title: 'Know what to do next',
          detail: 'A 30-day strategy and action calendar replace daily guesses about topics, channels, and priorities.',
        },
        {
          n: '03',
          title: 'Stop repeating product context',
          detail: 'Every agent shares your product facts, positioning, voice, goal, and latest market feedback.',
        },
        {
          n: '04',
          title: 'Learn faster from the market',
          detail: 'Publishing records, weekly reviews, and early PMF signals turn the next move into evidence.',
        },
      ];

  const paidFeatures = isZh
    ? [
        '一份全团队共享的冷启动简报、产品认知与 30 天推广蓝图',
        '每天可直接推进的内容草稿、制作说明和渠道任务',
        '在对话中审核和修改，反馈自动带入下一轮',
        '覆盖 SEO、官网、社交媒体、社区、视频和产品分发',
        `智能匹配 100+ 产品目录，自动提交至 ${CONFIGURED_DIRECTORY_COUNT} 个支持目录`,
        '完整的发布记录、每周复盘和下一轮行动建议',
      ]
    : [
        'Shared Launch Brief, product memory, and 30-day blueprint',
        'Daily content drafts, production briefs, and channel tasks',
        'Review in chat, request changes, and carry feedback forward',
        'SEO, website, social, community, video, and distribution work',
        `100+ intelligently matched directories and automated submission to ${CONFIGURED_DIRECTORY_COUNT} supported directories`,
        'Complete publishing record, weekly reviews, and next-step recommendations',
      ];

  return (
    <section id="pricing" className="bg-canvas-warm">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="index-label">{isZh ? '一支团队的能力，一个人的成本' : 'Team-sized launch. Indie-sized cost.'}</p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">
            {isZh ? (
              <>每天少做几小时准备，<br className="hidden sm:block" />把 30 分钟留给真正的判断。</>
            ) : (
              <>Turn hours of daily launch prep<br className="hidden sm:block" />into a 30-minute review.</>
            )}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-ink-muted">
            {isZh
              ? '智能团队负责研究、策划、起草内容、准备发布素材和提交目录。你每天打开 NowBuild，只需审核、修改，并决定什么值得继续推进。'
              : 'The agent team researches, plans content, prepares launch assets, and submits directories automatically. You open NowBuild to review, refine, and approve the work that matters.'}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white">
          <div className="grid md:grid-cols-[1fr_auto_1fr]">
            <div className="p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {isZh ? '自由职业者 / 代理机构组合' : 'Freelancer / agency stack'}
              </p>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-4xl font-bold tracking-tight text-ink">$2,000+</p>
                <span className="pb-1 text-xs text-zinc-500">{isZh ? '/ 月' : '/ month'}</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">
                {isZh ? '多人协作意味着反复交代背景、开会、交接和催进度，最后仍要由你掌握全局。' : 'Multiple people, repeated briefs, meetings, handoffs, and follow-up—with you holding the whole context together.'}
              </p>
            </div>

            <div className="hidden items-center justify-center px-4 md:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-canvas-warm font-mono text-[10px] font-semibold text-zinc-500">VS</span>
            </div>

            <div className="bg-ink p-7 text-white sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">NowBuild Launch Team</p>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-4xl font-bold tracking-tight">$49</p>
                <span className="pb-1 text-xs text-zinc-500">{isZh ? '/ 月' : '/ month'}</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
                {isZh ? '同一份产品认知、同一个 30 天目标、每天准备好的工作。无需招聘或管理团队，每天约 30 分钟即可完成审核。' : 'One product context, one campaign, and useful work ready every day. About 30 minutes to review, with no hiring or team management.'}
              </p>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-5xl text-center text-[10px] leading-5 text-zinc-400">
          {isZh ? '人力成本为示意对比；实际费用会因地区、角色组合和服务范围而不同。' : 'Human-service cost is an illustrative comparison; actual rates vary by region, role mix, and scope.'}
        </p>

        <div className="mx-auto mt-12 grid max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white sm:grid-cols-2 lg:grid-cols-4">
          {gains.map((gain) => (
            <article key={gain.n} className="border-b border-zinc-200 p-6 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
              <span className="font-mono text-[10px] font-semibold text-brand-700">{gain.n}</span>
              <h3 className="mt-8 text-lg font-semibold text-ink">{gain.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-muted">{gain.detail}</p>
            </article>
          ))}
        </div>

        <article className="relative mx-auto mt-6 grid max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-900 bg-ink text-white shadow-2xl lg:grid-cols-[1.2fr_.8fr]">
          <div className="border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">{isZh ? '完整交付' : 'What you get'}</p>
            <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {paidFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
                  <span className="text-emerald-400">✓</span>{feature}
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-white/10 pt-6 text-[11px] leading-5 text-zinc-500">
              {isZh
                ? '涉及第三方平台登录、付费和最终发布时，仍由你亲自确认；NowBuild 不保存平台密码。'
                : 'You keep final approval for external publishing, account access, payments, and submissions. NowBuild does not store third-party passwords.'}
            </p>
          </div>

          <div className="p-8 sm:p-10">
            <span className="text-xs font-semibold uppercase tracking-[0.13em] text-brand-300">{isZh ? '完整 30 天冷启动团队' : 'Full 30-day launch team'}</span>
            <h3 className="mt-6 text-3xl font-semibold">{isZh ? '30 天推广计划' : '30-Day Launch Team'}</h3>
            <div className="mt-7 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight">$49</span>
              <span className="pb-1 text-xs text-zinc-500">{isZh ? '/ 月' : '/ month'}</span>
            </div>
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              {isZh ? '为一个活跃的软件产品，完整推进一轮冷启动。' : 'One active software product. One coordinated launch campaign.'}
            </p>
            <Link href="/sign-up" className="mt-8 inline-flex h-13 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-brand-300">
              {isZh ? '组建我的推广团队' : 'Build My Launch Team'}
            </Link>
            <p className="mt-4 text-center text-[10px] leading-5 text-zinc-500">
              {isZh ? '先免费生成冷启动简报 · 每天约 30 分钟审核 · 随时取消' : 'Free Launch Brief first · About 30 minutes to review daily · Cancel anytime'}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

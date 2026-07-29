import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import ChannelLogo from '@/components/ChannelLogo';
import { Link } from '@/i18n/navigation';
import {
  buildAbsoluteUrl,
  localePath,
  languageAlternates,
} from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

const CHANNELS = [
  ['xiaohongshu', '小红书', 'Xiaohongshu'],
  ['user_outreach', '私域 / 朋友圈', 'Private outreach'],
  ['website_copy', '官网 / 落地页', 'Website'],
  ['wechat_official', '微信公众号', 'WeChat'],
  ['product_hunt', 'Product Hunt', 'Product Hunt'],
  ['twitter_x', 'Twitter / X', 'Twitter / X'],
  ['linkedin', 'LinkedIn', 'LinkedIn'],
  ['reddit', 'Reddit', 'Reddit'],
  ['hacker_news', 'Hacker News', 'Hacker News'],
  ['indie_hackers', 'Indie Hackers', 'Indie Hackers'],
  ['tiktok', 'TikTok', 'TikTok'],
  ['youtube', 'YouTube', 'YouTube'],
  ['instagram', 'Instagram', 'Instagram'],
  ['website_copy', 'SEO 内容', 'SEO content'],
  ['directory', '产品目录', 'Product directories'],
  ['github_growth', 'GitHub Growth', 'GitHub Growth'],
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === 'zh';
  const title = isZh
    ? '30 天冷启动如何运作｜NowBuild 产品体验'
    : 'How the 30-Day Campaign Works | NowBuild Product Tour';
  const description = isZh
    ? '从输入产品网址开始，了解 NowBuild 如何研究市场、制定 30 天推广蓝图、规划渠道、准备每日内容，并根据反馈完成每周复盘。'
    : 'See how NowBuild turns one product URL into a Launch Brief, shared Campaign Blueprint, channel-native plans, daily deliverables, and weekly reviews.';
  return {
    title,
    description,
    alternates: {
      canonical: localePath(locale, '/30-day-campaign'),
      languages: languageAlternates('/30-day-campaign'),
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: localePath(locale, '/30-day-campaign'),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CampaignExperiencePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';

  const setupSteps = isZh
    ? [
        ['01', '读懂产品与市场', '分析产品网站、公开功能、商业模式、目标用户、竞品与替代方案，并标明每项信息的可信程度。'],
        ['02', '整理冷启动简报', '把产品是什么、为谁服务、解决什么问题、应该如何定位，以及哪些信息仍需确认，整理成全团队共享的共识。'],
        ['03', '制定 30 天推广蓝图', '确定统一目标、核心定位、内容主线、四周叙事，以及所有渠道共同遵守的事实边界。'],
        ['04', '组建渠道团队', '为每个渠道分别安排任务、内容形式、发布节奏和成功信号，不把同一篇产品介绍原样复制到所有平台。'],
      ]
    : [
        ['01', 'Research the product and market', 'Read the product site, public capabilities, business model, audiences, competitors, and alternatives—then label the confidence of every important input.'],
        ['02', 'Build the Launch Brief', 'Bring together what the product is, who it serves, the problem it solves, how it should be positioned, and what still needs verification.'],
        ['03', 'Create the Campaign Blueprint', 'Define one 30-day goal, core position, campaign pillars, four-week narrative, and the factual guardrails shared by every channel.'],
        ['04', 'Assemble the channel team', 'Give every channel its own jobs, native formats, cadence, and success signals instead of copying one announcement everywhere.'],
      ];

  const deliverables = isZh
    ? [
        ['冷启动简报', '一份统一说明产品、受众、定位、竞品与可信证据的基础文档。'],
        ['30 天推广蓝图', '一项目标、3–5 条内容主线、四周叙事，以及每个渠道扮演的角色。'],
        ['渠道计划', '为每个渠道分别定义受众、内容形式、发布节奏、产品露出规则与潜在风险。'],
        ['行动日历', '第一周可以立即执行；第 8–30 天保持连贯，又不会为了填满日历而硬造任务。'],
        ['每日内容', '打开任务，即可获得可审核的文案，或完整的口播、分镜、逐页文案与美术方向。'],
        ['每周复盘', '依据已发布链接、表现数据和用户反馈，调整下一周尚未完成的工作。'],
      ]
    : [
        ['Launch Brief', 'One source of truth for the product, audience, position, competitors, and evidence.'],
        ['Campaign Blueprint', 'The 30-day goal, three to five campaign pillars, four-week narrative, and channel roles.'],
        ['Channel Plans', 'A native audience, format mix, cadence, product-mention rules, and risks for every channel.'],
        ['Launch Calendar', 'An executable week one and a connected—but never artificially filled—skeleton for days 8–30.'],
        ['Daily Deliverables', 'Open a task to generate review-ready copy or a script, storyboard, slide plan, and art direction.'],
        ['Weekly Review', 'Use published URLs, performance evidence, and feedback to adjust unfinished work for the next week.'],
      ];

  const weeks = isZh
    ? [
        ['第 1 周', '让用户认出问题', '从真实痛点、常见误区和现有做法的代价切入，先建立共同语言。', '轻度提及产品'],
        ['第 2 周', '让用户相信你', '分享创始人的观察、关键决策、构建过程与真实经验。', '轻度至适度提及'],
        ['第 3 周', '让用户看见解法', '通过使用场景、教程、功能演示、对比和完整流程讲清价值。', '适度提及产品'],
        ['第 4 周', '集中完成发布', '汇集证据、反馈与社会证明，给出清晰而克制的行动邀请。', '明确介绍产品'],
      ]
    : [
        ['Week 1', 'Make the problem recognizable', 'Build shared language around the pain, misconceptions, and cost of current workarounds.', 'Low product intensity'],
        ['Week 2', 'Build credibility', 'Share founder observations, key decisions, the building process, and real experience.', 'Low–medium intensity'],
        ['Week 3', 'Show the solution', 'Explain value through use cases, tutorials, demos, comparisons, and complete workflows.', 'Medium intensity'],
        ['Week 4', 'Concentrate the launch', 'Bring together evidence, feedback, and social proof with a clear but restrained invitation.', 'Clear product intensity'],
      ];

  const variants = isZh
    ? [
        ['hacker_news', 'Hacker News', '产品满足条件时，准备 Show HN 标题、技术故事、首评和回复预案。'],
        ['indie_hackers', 'Indie Hackers', '写成有真实限制、关键决策、实验结果和具体问题的创始人故事。'],
        ['tiktok', 'TikTok', '准备画面钩子、逐字口播、分镜、字幕、封面，以及单变量测试方案。'],
        ['youtube', 'YouTube', '扩展为搜索型教程或演示，包括标题、缩略图概念、章节和镜头表。'],
        ['instagram', 'Instagram', '设计成轮播图、原创梗图、Reels 或限时动态的逐页制作方案。'],
      ]
    : [
        ['hacker_news', 'Hacker News', 'When the product is ready, prepare a Show HN title, technical story, founder comment, and reply plan.'],
        ['indie_hackers', 'Indie Hackers', 'Turn it into a founder story with real constraints, decisions, experiment results, and one precise question.'],
        ['tiktok', 'TikTok', 'Create a visual hook, spoken script, shot list, captions, cover, and one-variable test.'],
        ['youtube', 'YouTube', 'Expand it into a searchable tutorial or demo with titles, thumbnail concepts, chapters, and shots.'],
        ['instagram', 'Instagram', 'Design a slide-by-slide carousel, original meme, Reel, or Stories production package.'],
      ];

  const userControl = isZh
    ? [
        ['NowBuild 负责', '研究、规划、搜索、写作、脚本、分镜、视觉说明、任务安排与复盘建议。'],
        ['你负责', '补充只有你知道的事实，审核品牌表达，提供真实素材，并决定最终是否发布。'],
        ['必须由你确认', '登录、验证码、上传媒体、最终发布、付款，以及任何会向第三方发送内容的操作。'],
      ]
    : [
        ['NowBuild handles', 'Research, planning, search, writing, scripts, storyboards, visual briefs, task scheduling, and review recommendations.'],
        ['You handle', 'Facts only you know, brand approval, authentic assets, and the final decision to publish.'],
        ['Actions that require confirmation', 'Login, CAPTCHA, media upload, final publishing, payment, and anything that sends content to a third party.'],
      ];

  const faq = isZh
    ? [
        ['我会一次收到 30 天的所有完整稿件吗？', '不会。开始时会先建立完整策略和任务框架；当你打开当天任务时，对应的渠道专员才会结合最新研究生成最终内容，避免后半程的稿件过早失效。'],
        ['每个渠道每天都会发布吗？', '不会。计划会尊重每个平台合理的发布节奏，不会为了填满日历而制造没有价值的内容。'],
        ['视频和图片会直接生成吗？', '目前的核心交付是可直接拍摄或设计的完整制作包，包括口播、分镜、逐页文案、美术方向与素材清单。只有真正完成渲染后，才会标记为成品。'],
        ['如果网站信息不完整怎么办？', '计划仍可继续，但系统会降低表达的确定程度，并明确标出待核实信息；不会编造用户、收入、效果数据或创始人经历。'],
      ]
    : [
        ['Do I receive 30 days of finished copy at once?', 'No. Setup creates the full strategy and task skeleton. Final content is generated when you open a task, using the latest available research so later work does not become stale.'],
        ['Does every channel publish every day?', 'No. The calendar follows a useful platform cadence and never creates low-value work just to fill a date.'],
        ['Are finished videos and images generated automatically?', 'The core deliverable today is a shoot-ready or design-ready production package: spoken copy, storyboards, slide plans, art direction, and asset lists. An asset is only called finished after it has actually been rendered.'],
        ['What if the product website is incomplete?', 'The campaign can continue with lower-confidence assumptions clearly marked. NowBuild will not invent customers, revenue, performance data, or founder experience.'],
      ];

  const howToData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: isZh ? '如何用 NowBuild 制定 30 天产品冷启动计划' : 'How to build a 30-day product campaign with NowBuild',
    description: isZh
      ? '从一个产品网址，生成每天可执行的多渠道冷启动计划。'
      : 'From one product URL to a daily, executable multi-channel campaign.',
    totalTime: 'P30D',
    step: setupSteps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step[1],
      text: step[2],
      url: `${buildAbsoluteUrl(localePath(locale, '/30-day-campaign'))}#step-${index + 1}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToData) }}
      />
      <Navbar variant="dark" />
      <main className="bg-white">
        <section className="relative overflow-hidden bg-night pb-24 pt-32 text-white sm:pb-32 sm:pt-40">
          <div className="bg-grid-dark absolute inset-0 opacity-70" aria-hidden />
          <div className="absolute left-[20%] top-12 h-[520px] w-[520px] rounded-full bg-brand-500/10 blur-[150px]" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-brand-300">
              {isZh ? '完整了解 30 天冷启动' : 'The 30-day campaign experience'}
            </p>
            <h1 className="mt-7 max-w-5xl font-[family-name:var(--font-display)] text-[2.55rem] font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl sm:leading-[0.96] sm:tracking-[-0.055em]">
              {isZh
                ? '从一个产品网址，到每天都有明确下一步。'
                : 'From one product URL to knowing what to do every day.'}
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">
              {isZh
                ? 'NowBuild 先梳理统一的产品事实和 30 天传播主线，再让每位渠道专员用符合平台语境的方式执行。你得到的不是一堆彼此无关的稿件，而是一套能持续推进、随时审核、根据反馈调整的冷启动计划。'
                : 'NowBuild first establishes shared product facts and one 30-day narrative. Channel agents then execute it in native formats. You receive a campaign that can be operated, reviewed, and improved—not a pile of disconnected drafts.'}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in" className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-sm font-bold text-black transition hover:bg-zinc-200">
                {isZh ? '制定我的 30 天计划' : 'Build my 30-day campaign'}
              </Link>
              <a href="#experience" className="inline-flex h-14 items-center justify-center rounded-full border border-white/15 px-8 text-sm font-semibold text-white transition hover:bg-white/[0.06]">
                {isZh ? '看看具体怎么做 ↓' : 'See the full experience ↓'}
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-xs text-zinc-500">
              <span>{isZh ? '无需自己研究渠道' : 'No channel selection required'}</span>
              <span>{isZh ? '第一周立即可执行' : 'Week one becomes executable first'}</span>
              <span>{isZh ? '发布前由你确认' : 'You approve before publishing'}</span>
            </div>
          </div>
        </section>

        <section id="experience" className="scroll-mt-20 bg-canvas-warm py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <p className="index-label">{isZh ? '从产品网址开始' : 'After you paste the URL'}</p>
            <h2 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.03] tracking-[-0.045em] text-ink sm:text-6xl">
              {isZh ? '先把方向想清楚，再开始写内容。' : 'Build the right campaign foundation before generating content.'}
            </h2>
            <div className="mt-14 grid gap-3 md:grid-cols-2">
              {setupSteps.map((step, index) => (
                <article id={`step-${index + 1}`} key={step[0]} className="rounded-3xl border border-black/[0.06] bg-white p-7 sm:p-9">
                  <span className="font-mono text-xs text-brand-600">{step[0]}</span>
                  <h3 className="mt-8 text-2xl font-bold text-ink">{step[1]}</h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-ink-muted">{step[2]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
              <div>
                <p className="index-label">{isZh ? '你会获得什么' : 'What you receive'}</p>
                <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.04] tracking-[-0.045em] text-ink sm:text-5xl">
                  {isZh ? '从策略到行动，每一份内容都前后相连。' : 'Every deliverable connects strategy to daily execution.'}
                </h2>
                <p className="mt-6 text-base leading-8 text-ink-muted">
                  {isZh
                    ? '开始时不会一次性堆出 30 天可能过时的稿件，而是先定好整体计划。等你打开当天任务，再结合最新研究生成最终内容。'
                    : 'Setup does not manufacture a month of stale copy. It builds the plan first, then generates final content with fresh research when you open a task.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {deliverables.map((item) => (
                  <article key={item[0]} className="rounded-3xl border border-zinc-200 bg-paper-dim p-6">
                    <h3 className="text-base font-bold text-ink">{item[0]}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-muted">{item[1]}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-night py-24 text-white sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-300">
              {isZh ? '四周沿着同一条主线推进' : 'One shared four-week narrative'}
            </p>
            <h2 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.03] tracking-[-0.045em] sm:text-6xl">
              {isZh ? '不为日更而日更，每一周都推动用户往前走一步。' : 'Not random daily posts—a campaign that advances week by week.'}
            </h2>
            <div className="mt-14 grid gap-3 lg:grid-cols-4">
              {weeks.map((week) => (
                <article key={week[0]} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                  <span className="font-mono text-xs text-brand-300">{week[0]}</span>
                  <h3 className="mt-8 text-xl font-bold">{week[1]}</h3>
                  <p className="mt-4 text-sm leading-6 text-zinc-400">{week[2]}</p>
                  <p className="mt-7 border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.16em] text-zinc-600">{week[3]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-4xl">
              <p className="index-label">{isZh ? '一个核心观点，五种平台表达' : 'One content atom, five native expressions'}</p>
              <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.03] tracking-[-0.045em] text-ink sm:text-6xl">
                {isZh ? '说的是同一件事，写法却要像这个平台的人。' : 'Share the same product truth without copying the same post.'}
              </h2>
            </div>
            <div className="mt-14 space-y-3">
              {variants.map((variant) => (
                <article key={variant[0]} className="grid items-center gap-4 rounded-3xl border border-zinc-200 bg-paper-dim p-5 sm:grid-cols-[auto_180px_1fr] sm:p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <ChannelLogo channelId={variant[0]} size={26} />
                  </span>
                  <h3 className="text-base font-bold text-ink">{variant[1]}</h3>
                  <p className="text-sm leading-6 text-ink-muted">{variant[2]}</p>
                </article>
              ))}
            </div>
            <div className="mt-12 rounded-3xl bg-canvas-warm p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {isZh ? '目前支持的推广渠道' : 'Currently supported channel workspaces'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {CHANNELS.map((channel) => (
                  <span key={`${channel[0]}-${channel[1]}`} className="inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3 py-2 text-xs font-medium text-ink-soft">
                    <ChannelLogo channelId={channel[0]} size={16} />
                    {isZh ? channel[1] : channel[2]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-canvas-warm py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="index-label">{isZh ? '每天只需处理三件事' : 'What daily use feels like'}</p>
                <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.04] tracking-[-0.045em] text-ink sm:text-5xl">
                  {isZh ? '看任务、审内容、做决定。' : 'You only need to handle today’s highest-leverage work.'}
                </h2>
                <p className="mt-6 text-base leading-8 text-ink-muted">
                  {isZh
                    ? '打开工作台，先看今天的任务；进入任务后，内容会自动准备好。需要修改时，直接告诉你的市场合伙人即可。'
                    : 'Open the command center, review today’s queue, and enter a task to prepare its content. When something needs changing, talk to one Launch Partner.'}
                </p>
              </div>
              <div className="space-y-3">
                {userControl.map((item) => (
                  <article key={item[0]} className="rounded-3xl border border-black/[0.06] bg-white p-7">
                    <h3 className="text-base font-bold text-ink">{item[0]}</h3>
                    <p className="mt-3 text-sm leading-7 text-ink-muted">{item[1]}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <div className="text-center">
              <p className="index-label">{isZh ? '开始前，你可能还想知道' : 'Before you start'}</p>
              <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">
                {isZh ? '关于 30 天冷启动的几个常见问题' : 'A few common questions about the 30-day campaign'}
              </h2>
            </div>
            <div className="mt-12 space-y-3">
              {faq.map((item) => (
                <article key={item[0]} className="rounded-3xl border border-zinc-200 bg-paper-dim p-6 sm:p-8">
                  <h3 className="text-base font-bold text-ink">{item[0]}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink-muted">{item[1]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-night py-24 text-white sm:py-32">
          <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-300">
              {isZh ? '产品已经上线，别让它停在这里' : 'Your product is already live'}
            </p>
            <h2 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">
              {isZh ? '给它 30 天，也给市场一个认识它的机会。' : 'Now give it 30 days of consistent market execution.'}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-400">
              {isZh
                ? '输入产品网址，NowBuild 会先完成研究，再制定完整计划。需要你参与时，原因和下一步都会写得清清楚楚。'
                : 'Paste the product URL. NowBuild researches first, then builds the campaign. Whenever your input is required, the reason and next action stay clear.'}
            </p>
            <Link href="/sign-in" className="mt-9 inline-flex h-14 items-center justify-center rounded-full bg-white px-9 text-sm font-bold text-black transition hover:bg-zinc-200">
              {isZh ? '制定我的 30 天计划' : 'Build my 30-day campaign'}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

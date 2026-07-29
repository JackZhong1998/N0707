import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const PATHS_EN = [
  {
    label: '30-day roadmap',
    title: 'How do you launch a product when marketing is new to you?',
    answer: 'Start with one position, two or three priority channels, and a daily plan that moves from problem awareness to proof and launch.',
    href: '/blog/product-done-now-what',
    cta: 'Read the launch roadmap',
  },
  {
    label: 'Channel strategy',
    title: 'Which marketing channel should a solo founder choose first?',
    answer: 'Choose where your specific users already discuss the problem—not the platform with the loudest growth story.',
    href: '/blog/how-to-choose-first-channel',
    cta: 'Compare channels by product type',
  },
  {
    label: 'First users',
    title: 'Can you find your first 100 users without paid ads?',
    answer: 'Yes. Founder stories, careful one-to-one outreach, and useful answers in relevant communities create the earliest feedback loops.',
    href: '/blog/first-100-users-without-ads',
    cta: 'See the organic playbook',
  },
  {
    label: 'Directory SEO',
    title: 'Where should you submit a new SaaS or AI product?',
    answer: 'Use a filtered directory database, match sites to your product type, and track every submission, approval, and required follow-up.',
    href: '/directories',
    cta: 'Explore the launch directory',
  },
];

const PATHS_ZH = [
  {
    label: '30 天路线图',
    title: '从没做过推广，产品上线后第一步做什么？',
    answer: '先明确一个产品定位和两到三个主渠道，再把问题、信任、价值与发布拆成每天可执行的动作。',
    href: '/blog/product-done-now-what',
    cta: '查看第一次推广路线图',
  },
  {
    label: '渠道选择',
    title: '独立开发者应该先做哪个推广渠道？',
    answer: '先找目标用户已经在讨论问题的地方，而不是追逐看起来最热闹的平台。',
    href: '/blog/how-to-choose-first-channel',
    cta: '按产品类型选择渠道',
  },
  {
    label: '第一批用户',
    title: '不投广告，能找到前 100 个用户吗？',
    answer: '可以。用真实的创始人故事、一对一触达和社区中的高质量回答，先建立最早的反馈循环。',
    href: '/blog/first-100-users-without-ads',
    cta: '查看零广告获客方法',
  },
  {
    label: '产品目录 SEO',
    title: '新上线的 SaaS 或 AI 产品可以提交到哪里？',
    answer: '使用按产品类型筛选的目录数据库，并记录每次提交、审核、收录与待处理状态。',
    href: '/directories',
    cta: '查看产品发布目录',
  },
];

export default async function SearchPaths() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const paths = isZh ? PATHS_ZH : PATHS_EN;

  return (
    <section className="border-y border-zinc-200 bg-white" aria-labelledby="launch-answers-title">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="index-label">{isZh ? '先解决你现在的问题' : 'Start with the job to be done'}</p>
            <h2 id="launch-answers-title" className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.04] tracking-[-0.045em] text-ink sm:text-5xl">
              {isZh ? '每一个推广难题，先给你一个可执行的答案。' : 'A practical answer for the launch problem you have now.'}
            </h2>
            <p className="mt-6 text-base leading-8 text-ink-muted">
              {isZh ? '这些指南对应产品冷启动中最常见的搜索问题，也是 NowBuild 会放进 30 天行动计划里的核心决策。' : 'These guides answer the most common product-launch questions and explain the decisions NowBuild turns into a 30-day execution plan.'}
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
            {paths.map((path) => (
              <article key={path.title} className="flex min-h-[290px] flex-col bg-paper-dim p-7 transition-colors hover:bg-white sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-700">{path.label}</p>
                <h3 className="mt-5 text-xl font-semibold leading-7 text-ink">{path.title}</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-ink-muted">{path.answer}</p>
                <Link href={path.href} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-zinc-300 underline-offset-4 transition hover:decoration-ink">
                  {path.cta} <span aria-hidden>↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

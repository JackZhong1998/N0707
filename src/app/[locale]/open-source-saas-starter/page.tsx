import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/i18n/navigation';
import { buildAbsoluteUrl, getSiteName, languageAlternates, localePath } from '@/lib/seo';

const REPOSITORY_URL = 'https://github.com/JackZhong1998/nowbuild-saas-kit';
const PAGE_PATH = '/open-source-saas-starter';

type Props = {
  params: Promise<{ locale: string }>;
};

const content = {
  en: {
    eyebrow: 'OPEN SOURCE · MIT LICENSE',
    title: 'Ship your SaaS, not the plumbing.',
    description:
      'A production-ready Next.js starter with authentication, subscriptions, database, analytics, SEO, and internationalization already connected.',
    github: 'View on GitHub ↗',
    quickStart: 'Quick start',
    proof: [
      ['1 day', 'to a working SaaS foundation'],
      ['9 tools', 'connected in one codebase'],
      ['MIT', 'free to use and customize'],
    ],
    includedEyebrow: 'WHAT IS INCLUDED',
    includedTitle: 'The parts every SaaS needs, already wired together.',
    features: [
      ['Authentication', 'Clerk sign-up, sign-in, sessions, and social login flows.'],
      ['Subscriptions', 'Stripe monthly and yearly billing with verified webhook handling.'],
      ['Database', 'Supabase and PostgreSQL foundations for users and subscriptions.'],
      ['SEO foundation', 'Metadata, canonical URLs, structured data, sitemap, and multilingual routes.'],
      ['Product analytics', 'Google Analytics integration for measuring acquisition and behavior.'],
      ['Launch-ready pages', 'Landing, pricing, blog, about, privacy, terms, and account flows.'],
    ],
    stackEyebrow: 'THE STACK',
    stackTitle: 'Modern defaults. No mystery abstractions.',
    stackDescription:
      'The kit stays close to the tools it uses, so you can replace any service without fighting a custom framework.',
    stack: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'Clerk', 'Stripe', 'Supabase', 'next-intl', 'Google Analytics'],
    setupEyebrow: 'START IN THREE COMMANDS',
    setupTitle: 'Clone it. Configure it. Make it yours.',
    setupDescription:
      'The repository includes bilingual setup documentation, environment templates, database schema, and deployment guidance.',
    code: 'git clone https://github.com/JackZhong1998/nowbuild-saas-kit.git\ncd nowbuild-saas-kit\nnpm install',
    readDocs: 'Open the repository and read the setup guide ↗',
    relationshipEyebrow: 'BUILT BY NOWBUILD',
    relationshipTitle: 'A starter for building the product. A launch team for finding its users.',
    relationshipDescription:
      'NowBuild SaaS Kit helps you ship the foundation. When the product is ready, NowBuild turns it into a coordinated 30-day launch across content, communities, and directories.',
    tryNowBuild: 'Launch your product with NowBuild →',
    faqEyebrow: 'BEFORE YOU CLONE',
    faqTitle: 'Straight answers.',
    faqs: [
      ['Can I use it commercially?', 'Yes. The project uses the MIT License, so you can use, modify, and commercialize it.'],
      ['Is it a no-code builder?', 'No. It is a clean TypeScript codebase for builders who want ownership and the freedom to customize.'],
      ['Do I need every included service?', 'No. Clerk, Stripe, Supabase, analytics, and other integrations can be replaced as your product evolves.'],
      ['Does it deploy only to Vercel?', 'No. It is a standard Next.js application and can run anywhere that supports Node.js.'],
    ],
    finalTitle: 'Start with working infrastructure.',
    finalDescription: 'Fork the repository, follow the guide, and spend the next few days on the part only you can build.',
  },
  zh: {
    eyebrow: '开源项目 · MIT 许可证',
    title: '把时间花在产品上，不要重复造轮子。',
    description: '一套可投入生产的 Next.js SaaS 框架，认证、订阅支付、数据库、数据分析、SEO 和多语言已经接通。',
    github: '前往 GitHub ↗',
    quickStart: '快速开始',
    proof: [
      ['1 天', '搭好可用的 SaaS 基础'],
      ['9 项', '常用能力集成在同一代码库'],
      ['MIT', '可自由使用、修改和商用'],
    ],
    includedEyebrow: '框架包含什么',
    includedTitle: '每个 SaaS 都要做的基础工作，已经替你接好了。',
    features: [
      ['用户认证', '基于 Clerk 的注册、登录、会话和社交账号登录流程。'],
      ['订阅支付', 'Stripe 月付、年付订阅，以及经过校验的 Webhook 处理。'],
      ['数据库', '基于 Supabase 和 PostgreSQL 的用户与订阅数据基础。'],
      ['SEO 基础', '元数据、Canonical、结构化数据、站点地图和多语言路由。'],
      ['产品分析', '集成 Google Analytics，持续了解获客来源和用户行为。'],
      ['上线必备页面', '官网、定价、博客、关于、隐私、条款与账号流程。'],
    ],
    stackEyebrow: '技术栈',
    stackTitle: '现代、透明，也方便替换。',
    stackDescription: '框架尽量贴近每项工具本身，不增加神秘的封装；产品变化时，你可以自由替换任何服务。',
    stack: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'Clerk', 'Stripe', 'Supabase', 'next-intl', 'Google Analytics'],
    setupEyebrow: '三条命令开始',
    setupTitle: '克隆、配置，然后做成你的产品。',
    setupDescription: '仓库内含中英文配置文档、环境变量模板、数据库结构和部署指南。',
    code: 'git clone https://github.com/JackZhong1998/nowbuild-saas-kit.git\ncd nowbuild-saas-kit\nnpm install',
    readDocs: '打开 GitHub 仓库并查看配置指南 ↗',
    relationshipEyebrow: 'NOWBUILD 出品',
    relationshipTitle: '这套框架帮你做出产品，NowBuild 帮产品找到用户。',
    relationshipDescription: 'NowBuild SaaS Kit 负责产品基础设施。产品准备好之后，NowBuild 会把它变成一套跨内容、社区和产品目录协同执行的 30 天冷启动。',
    tryNowBuild: '用 NowBuild 启动产品 →',
    faqEyebrow: '克隆之前',
    faqTitle: '几个直接的答案。',
    faqs: [
      ['可以商用吗？', '可以。项目采用 MIT 许可证，你可以自由使用、修改和商用。'],
      ['它是无代码建站工具吗？', '不是。它是一套清晰的 TypeScript 代码，适合希望掌控代码并持续定制的开发者。'],
      ['必须使用所有内置服务吗？', '不需要。Clerk、Stripe、Supabase 和数据分析等集成都可以随产品发展替换。'],
      ['只能部署到 Vercel 吗？', '不是。它是标准 Next.js 应用，可以部署到任何支持 Node.js 的环境。'],
    ],
    finalTitle: '从可用的基础设施开始。',
    finalDescription: 'Fork 仓库，跟着文档完成配置，把接下来的时间留给只有你能做出的产品。',
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === 'zh';
  const title = isZh ? '开源 SaaS 框架 — Next.js、Stripe、Supabase' : 'Open-Source SaaS Starter — Next.js, Stripe, Supabase';
  const description = isZh
    ? 'NowBuild SaaS Kit 是一套 MIT 开源的 Next.js SaaS 框架，内置认证、订阅支付、数据库、SEO、数据分析和中英双语。'
    : 'NowBuild SaaS Kit is an MIT-licensed Next.js SaaS starter with authentication, subscriptions, database, SEO, analytics, and internationalization.';

  return {
    title,
    description,
    keywords: isZh
      ? ['开源 SaaS 框架', 'Next.js SaaS 模板', 'SaaS 开源项目', 'Stripe 订阅', 'Supabase']
      : ['open source SaaS starter', 'Next.js SaaS template', 'SaaS boilerplate', 'Stripe subscriptions', 'Supabase'],
    alternates: {
      canonical: localePath(locale, PAGE_PATH),
      languages: languageAlternates(PAGE_PATH),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: localePath(locale, PAGE_PATH),
      images: [{
        url: buildAbsoluteUrl('/nowbuild-saas-kit-og.png'),
        width: 1731,
        height: 909,
        alt: 'NowBuild SaaS Kit — Open-source SaaS starter',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [buildAbsoluteUrl('/nowbuild-saas-kit-og.png')],
    },
  };
}

export default async function OpenSourceSaasStarterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const copy = isZh ? content.zh : content.en;

  const sourceCodeData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'NowBuild SaaS Kit',
    description: copy.description,
    codeRepository: REPOSITORY_URL,
    license: 'https://opensource.org/license/mit',
    programmingLanguage: ['TypeScript', 'JavaScript'],
    runtimePlatform: 'Node.js',
    author: {
      '@type': 'Organization',
      name: getSiteName(),
      url: buildAbsoluteUrl(localePath(locale)),
    },
  };

  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sourceCodeData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />
      <Navbar variant="dark" />
      <main className="overflow-hidden bg-zinc-50">
        <section className="relative bg-night pb-16 pt-28 text-white sm:pb-24 sm:pt-36">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400 ring-1 ring-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {copy.eyebrow}
              </div>
              <h1 className="max-w-4xl font-display text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-[5.4rem]">
                {copy.title}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
                {copy.description}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href={REPOSITORY_URL}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black transition-colors hover:bg-zinc-200"
                >
                  {copy.github}
                </a>
                <a
                  href="#quick-start"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/5 px-6 text-sm font-semibold text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {copy.quickStart} ↓
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/[0.04] p-4 shadow-2xl shadow-black/40 ring-1 ring-white/10 sm:p-6">
              <div className="mb-4 flex items-center gap-2 px-1">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                <span className="ml-auto font-mono text-[10px] text-zinc-600">nowbuild-saas-kit</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['AUTH', 'PAYMENTS', 'DATABASE', 'SEO + I18N'].map((item, index) => (
                  <div key={item} className="min-h-32 rounded-2xl bg-black/35 p-4 ring-1 ring-white/10">
                    <div className="font-mono text-[10px] tracking-[0.14em] text-zinc-600">0{index + 1}</div>
                    <div className="mt-9 font-mono text-xs font-medium tracking-[0.08em] text-zinc-200">{item}</div>
                    <div className="mt-3 h-1 w-10 rounded-full bg-brand-500/80" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-8 pb-6 sm:-mt-10">
          <div className="mx-auto grid max-w-7xl gap-3 px-5 sm:grid-cols-3 sm:px-8">
            {copy.proof.map(([value, label]) => (
              <div key={label} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200/80 sm:p-7">
                <div className="font-display text-3xl font-black tracking-[-0.04em] text-zinc-950">{value}</div>
                <div className="mt-1.5 text-sm text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="index-label">{copy.includedEyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-zinc-950 sm:text-5xl">{copy.includedTitle}</h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {copy.features.map(([title, description], index) => (
                <article key={title} className="min-h-56 rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-zinc-200/80 sm:p-8">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 font-mono text-[11px] font-medium text-brand-600">
                    0{index + 1}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-zinc-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16 sm:pb-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-zinc-200/80 sm:p-10 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
                <div className="max-w-xl">
                  <p className="index-label">{copy.stackEyebrow}</p>
                  <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-zinc-950 sm:text-5xl">{copy.stackTitle}</h2>
                  <p className="mt-6 text-base leading-7 text-zinc-600">{copy.stackDescription}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {copy.stack.map((item, index) => (
                    <div key={item} className="flex min-h-24 flex-col justify-between rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
                      <span className="font-mono text-[10px] text-zinc-400">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-sm font-semibold text-zinc-900">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="quick-start" className="scroll-mt-20 px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] bg-night p-7 text-white sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12 lg:p-12">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">{copy.setupEyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{copy.setupTitle}</h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400">{copy.setupDescription}</p>
              <a href={REPOSITORY_URL} target="_blank" rel="noopener" className="mt-8 inline-block text-sm font-semibold text-white underline decoration-zinc-700 underline-offset-4 hover:decoration-white">
                {copy.readDocs}
              </a>
            </div>
            <div className="overflow-hidden rounded-2xl bg-black/50 shadow-2xl ring-1 ring-white/10">
              <div className="flex items-center px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500/80" />
                terminal
                <span className="ml-auto">bash</span>
              </div>
              <pre className="overflow-x-auto px-5 pb-5 font-mono text-xs leading-7 text-zinc-300 sm:px-7 sm:pb-7 sm:text-sm">
                <code>{copy.code}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="pb-16 sm:pb-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-8 rounded-[2rem] bg-gradient-to-br from-zinc-100 to-white p-7 shadow-sm ring-1 ring-zinc-200/80 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:p-12">
              <div className="max-w-3xl">
                <p className="index-label">{copy.relationshipEyebrow}</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-zinc-950 sm:text-4xl">{copy.relationshipTitle}</h2>
                <p className="mt-5 text-base leading-7 text-zinc-600">{copy.relationshipDescription}</p>
              </div>
              <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-bold text-white transition-colors hover:bg-zinc-800">
                {copy.tryNowBuild}
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-16 sm:pb-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
            <div>
              <p className="index-label">{copy.faqEyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-zinc-950 sm:text-5xl">{copy.faqTitle}</h2>
            </div>
            <div className="grid gap-3">
              {copy.faqs.map(([question, answer]) => (
                <article key={question} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200/80 sm:p-7">
                  <h3 className="text-lg font-bold text-zinc-950">{question}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-[2rem] bg-brand-500 p-8 sm:p-10 lg:flex-row lg:items-end lg:justify-between lg:p-12">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-black tracking-[-0.045em] text-night sm:text-5xl">{copy.finalTitle}</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-night/70">{copy.finalDescription}</p>
            </div>
            <a href={REPOSITORY_URL} target="_blank" rel="noopener" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-night px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
              {copy.github}
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

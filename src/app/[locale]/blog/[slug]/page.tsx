import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/i18n/navigation';
import { buildAbsoluteUrl, getBaseUrl, getSiteName, localePath, languageAlternates } from '@/lib/seo';
import enMessages from '@/messages/en.json';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Statically generate every post so it lands in the build output (and sitemap).
export function generateStaticParams() {
  return enMessages.Blog.posts.map((post) => ({ slug: post.slug }));
}

function getFirstUsersNextSteps(locale: string) {
  return locale === 'zh'
    ? {
        eyebrow: '把方法变成行动',
        title: '接下来，选对渠道并排出 30 天计划',
        description: '先根据产品类型确定优先渠道，再把触达、内容和复盘安排进同一套冷启动节奏。',
        relatedLabel: '继续阅读',
        related: [
          {
            href: '/blog/how-to-choose-first-channel',
            title: '按产品类型选择第一个推广渠道',
          },
          {
            href: '/blog/product-done-now-what',
            title: '查看第一次推广的 30 天路线图',
          },
        ],
        cta: '制定我的 30 天推广计划',
      }
    : {
        eyebrow: 'Turn the playbook into action',
        title: 'Next, choose your channels and map the next 30 days',
        description: 'Start with the channels that fit your product, then connect outreach, content, and review in one launch rhythm.',
        relatedLabel: 'Continue reading',
        related: [
          {
            href: '/blog/how-to-choose-first-channel',
            title: 'Choose your first marketing channel by product type',
          },
          {
            href: '/blog/product-done-now-what',
            title: 'Follow the 30-day roadmap for your first launch',
          },
        ],
        cta: 'Build my 30-day marketing plan',
      };
}

async function getPost(locale: string, slug: string) {
  const t = await getTranslations({ locale, namespace: 'Blog' });
  for (let i = 0; i < 10; i++) {
    try {
      const postSlug = t(`posts.${i}.slug`);
      if (postSlug === slug) {
        return {
          slug: postSlug,
          title: t(`posts.${i}.title`),
          excerpt: t(`posts.${i}.excerpt`),
          date: t(`posts.${i}.date`),
          author: t(`posts.${i}.author`),
          readTime: t(`posts.${i}.readTime`),
          content: t(`posts.${i}.content`),
        };
      }
    } catch {
      break;
    }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: localePath(locale, `/blog/${slug}`),
      languages: languageAlternates(`/blog/${slug}`),
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: localePath(locale, `/blog/${slug}`),
      images: [buildAbsoluteUrl('/og.png')],
    },
    twitter: {
      title: post.title,
      description: post.excerpt,
      card: 'summary_large_image',
      images: [buildAbsoluteUrl('/og.png')],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: 'Blog' });
  const firstUsersNextSteps = getFirstUsersNextSteps(locale);

  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url: buildAbsoluteUrl(localePath(locale, `/blog/${slug}`)),
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    author: {
      '@type': 'Organization',
      name: post.author,
      url: getBaseUrl(),
    },
    publisher: {
      '@type': 'Organization',
      name: getSiteName(),
      url: getBaseUrl(),
    },
    mainEntityOfPage: buildAbsoluteUrl(localePath(locale, `/blog/${slug}`)),
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: buildAbsoluteUrl(localePath(locale)) },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: buildAbsoluteUrl(localePath(locale, '/blog')) },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <Navbar />
      <main className="bg-white">
        <article className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {/* Back Link */}
            <Link
              href="/blog"
              className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
            >
              {t('backToBlog')}
            </Link>

            {/* Header */}
            <header className="mb-10">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <time dateTime={post.date}>{post.date}</time>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>{t('minRead', { minutes: post.readTime })}</span>
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {post.title}
              </h1>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                  {post.author[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{post.author}</div>
                </div>
              </div>
            </header>

            {/* Content */}
            <div className="prose prose-lg prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-a:text-primary-600">
              {post.content.split('\n\n').map((paragraph, i) => {
                if (paragraph.startsWith('## ')) {
                  return <h2 key={i} className="mt-10 mb-4 text-2xl">{paragraph.replace('## ', '')}</h2>;
                }
                return <p key={i} className="mb-4 leading-relaxed text-gray-600">{paragraph}</p>;
              })}
            </div>

            {post.slug === 'first-100-users-without-ads' && (
              <aside
                className="mt-14 rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:p-8"
                aria-labelledby="first-users-next-step"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
                  {firstUsersNextSteps.eyebrow}
                </p>
                <h2
                  id="first-users-next-step"
                  className="mt-3 font-display text-2xl font-bold tracking-tight text-gray-900"
                >
                  {firstUsersNextSteps.title}
                </h2>
                <p className="mt-3 leading-7 text-gray-600">
                  {firstUsersNextSteps.description}
                </p>
                <nav className="mt-6" aria-label={firstUsersNextSteps.relatedLabel}>
                  <p className="text-sm font-semibold text-gray-900">
                    {firstUsersNextSteps.relatedLabel}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {firstUsersNextSteps.related.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="text-sm font-medium text-primary-600 underline decoration-primary-200 underline-offset-4 transition-colors hover:text-primary-700"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <Link
                  href="/sign-in"
                  className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  {firstUsersNextSteps.cta}
                </Link>
              </aside>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

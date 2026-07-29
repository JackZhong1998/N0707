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
    },
    twitter: {
      title: post.title,
      description: post.excerpt,
      card: 'summary_large_image',
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: 'Blog' });

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
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

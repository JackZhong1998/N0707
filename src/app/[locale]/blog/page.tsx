import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/i18n/navigation';
import { buildAbsoluteUrl, localePath, languageAlternates } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.blog' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: localePath(locale, '/blog'),
      languages: languageAlternates('/blog'),
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Blog' });

  const posts = Array.from({ length: 3 }, (_, i) => ({
    slug: t(`posts.${i}.slug`),
    title: t(`posts.${i}.title`),
    excerpt: t(`posts.${i}.excerpt`),
    date: t(`posts.${i}.date`),
    author: t(`posts.${i}.author`),
    readTime: t(`posts.${i}.readTime`),
  }));

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: buildAbsoluteUrl(localePath(locale)) },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: buildAbsoluteUrl(localePath(locale, '/blog')) },
    ],
  };

  const blogCollectionData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('title'),
    description: t('subtitle'),
    url: buildAbsoluteUrl(localePath(locale, '/blog')),
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: post.title,
        url: buildAbsoluteUrl(localePath(locale, `/blog/${post.slug}`)),
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogCollectionData) }}
      />
      <Navbar />
      <main className="bg-white">
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-16 text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                {t('title')}
              </h1>
              <p className="mt-4 text-lg text-gray-500">{t('subtitle')}</p>
            </div>

            {/* Posts Grid */}
            <div className="space-y-10">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-primary-100 hover:shadow-md sm:p-8"
                >
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <time dateTime={post.date}>{post.date}</time>
                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                    <span>{t('minRead', { minutes: post.readTime })}</span>
                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                    <span>{post.author}</span>
                  </div>

                  <h2 className="mt-3 font-display text-xl font-bold text-gray-900 transition-colors group-hover:text-primary-600 sm:text-2xl">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>

                  <p className="mt-3 text-base leading-relaxed text-gray-500">
                    {post.excerpt}
                  </p>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
                  >
                    {t('readMore')}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

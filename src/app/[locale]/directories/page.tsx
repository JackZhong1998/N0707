import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import DirectoryExplorer from '@/components/directories/DirectoryExplorer';
import { launchDirectories } from '@/lib/directories/data';
import { buildAbsoluteUrl, languageAlternates, localePath } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === 'zh';

  return {
    title: isZh ? '产品发布平台大全 — 123 个免费与付费收录网站' : 'Product Launch Directory — 123 Places to List Your Product',
    description: isZh
      ? '免费搜索和筛选 123 个产品发布平台、创业社区与软件目录，查看费用、DR 与链接类型，并直接前往目标网站。'
      : 'Search and filter 123 product launch platforms, startup communities, and software directories by pricing, DR, and link type.',
    alternates: {
      canonical: localePath(locale, '/directories'),
      languages: languageAlternates('/directories'),
    },
  };
}

export default async function DirectoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const pageUrl = buildAbsoluteUrl(localePath(locale, '/directories'));
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: locale === 'zh' ? '产品发布平台大全' : 'Product Launch Directory',
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: launchDirectories.length,
      itemListElement: launchDirectories.map((directory, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'WebSite',
          name: directory.name,
          url: directory.url,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <DirectoryExplorer locale={locale} />
      <Footer />
    </>
  );
}

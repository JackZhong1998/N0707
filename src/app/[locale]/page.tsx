import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import SystemBento from '@/components/landing/SystemBento';
import FlowSteps from '@/components/landing/FlowSteps';
import CalendarGlimpse from '@/components/landing/CalendarGlimpse';
import ClosingCta from '@/components/landing/ClosingCta';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import { buildAbsoluteUrl, getBaseUrl, getSiteName, localePath, languageAlternates } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.home' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: localePath(locale),
      languages: languageAlternates(),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'FAQ' });
  const faqItems = Array.from({ length: 6 }, (_, i) => ({
    question: t(`items.${i}.question`),
    answer: t(`items.${i}.answer`),
  }));

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const orgStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: getSiteName(),
    url: getBaseUrl(),
    logo: buildAbsoluteUrl('/logo.png'),
    sameAs: [],
  };

  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: getSiteName(),
    url: getBaseUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${buildAbsoluteUrl(localePath(locale, '/blog'))}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const tMeta = await getTranslations({ locale, namespace: 'Metadata.home' });
  const softwareStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: getSiteName(),
    description: tMeta('description'),
    url: getBaseUrl(),
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '19',
      priceCurrency: 'USD',
      offerCount: 2,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <Navbar variant="dark" />
      <main>
        <Hero />
        <SystemBento />
        <FlowSteps />
        <CalendarGlimpse />
        <FAQ />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}

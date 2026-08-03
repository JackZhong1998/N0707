import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import StopRandom from '@/components/landing/StopRandom';
import AgentTeam from '@/components/landing/AgentTeam';
import Channels from '@/components/landing/Channels';
import CalendarGlimpse from '@/components/landing/CalendarGlimpse';
import Comparison from '@/components/landing/Comparison';
import ClosingCta from '@/components/landing/ClosingCta';
import FAQ from '@/components/landing/FAQ';
import LandingPricing from '@/components/landing/LandingPricing';
import Footer from '@/components/landing/Footer';
import { buildAbsoluteUrl, getBaseUrl, getSiteName, localePath, languageAlternates } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.home' });
  return {
    title: { absolute: t('title') },
    description: t('description'),
    alternates: {
      canonical: localePath(locale),
      languages: languageAlternates(),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: localePath(locale),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'FAQ' });
  const faqItems = Array.from({ length: 8 }, (_, i) => ({
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
    logo: buildAbsoluteUrl('/icon.svg'),
    sameAs: [],
  };

  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: getSiteName(),
    url: getBaseUrl(),
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
    audience: {
      '@type': 'Audience',
      audienceType: locale === 'zh' ? '独立开发者和一人公司' : 'Solo founders and one-person companies',
    },
    featureList: [
      '30-day product launch plan',
      'Platform-specific AI marketing agents',
      'Daily content calendar',
      'SEO topic clusters',
      '100+ matched directory opportunities and automated submission to 76 supported directories',
    ],
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free 30-Day Market Strategy Report' },
      { '@type': 'Offer', price: '49', priceCurrency: 'USD', name: '30-Day Agent Launch Team', priceSpecification: { '@type': 'UnitPriceSpecification', price: '49', priceCurrency: 'USD', billingDuration: 'P1M' } },
    ],
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
        <StopRandom />
        <CalendarGlimpse />
        <AgentTeam />
        <Channels />
        <LandingPricing />
        <Comparison />
        <FAQ />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}

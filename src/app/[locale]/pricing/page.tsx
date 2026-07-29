import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PricingPageClient from '@/components/pricing/PricingPageClient';
import { buildAbsoluteUrl, getSiteName, localePath, languageAlternates } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata.pricing' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: localePath(locale, '/pricing'),
      languages: languageAlternates('/pricing'),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: localePath(locale, '/pricing'),
      type: 'website',
    },
    twitter: {
      title: t('title'),
      description: t('description'),
      card: 'summary_large_image',
    },
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'Pricing' });

  const faqItems = Array.from({ length: 3 }, (_, i) => ({
    question: t(`faq.items.${i}.question`),
    answer: t(`faq.items.${i}.answer`),
  }));

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${getSiteName()} 30-Day Agent Launch Team`,
    description: t('plans.pro.description'),
    url: buildAbsoluteUrl(localePath(locale, '/pricing')),
    brand: { '@type': 'Brand', name: getSiteName() },
    offers: [
      {
        '@type': 'Offer',
        name: 'Agent Launch Team Monthly',
        price: '49',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: buildAbsoluteUrl(localePath(locale, '/pricing')),
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '49',
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }}
      />
      <PricingPageClient />
    </>
  );
}

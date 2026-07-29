import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '@/app/globals.css';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Inter_Tight, IBM_Plex_Mono } from 'next/font/google';
import { routing } from '@/i18n/routing';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { getBaseUrl, getSiteName } from '@/lib/seo';

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
  preload: true,
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: `${getSiteName()} — Your 30-Day Agent Launch Team`,
      template: `%s | ${getSiteName()}`,
    },
    applicationName: getSiteName(),
    icons: {
      icon: '/icon.svg',
      apple: '/icon.svg',
    },
    keywords: [
      'software product launch',
      '30-day agent launch team',
      '30-day launch campaign',
      'product launch agents',
      'marketing for solo founders',
      'SaaS launch plan',
      'product directory submission',
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      siteName: getSiteName(),
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? ['en_US'] : ['zh_CN'],
      images: [
        {
          url: '/og.png',
          width: 1730,
          height: 909,
          alt: 'NowBuild — Your 30-Day Agent Launch Team',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og.png'],
    },
    alternates: {
      languages: {
        en: '/',
        zh: '/zh',
        'x-default': '/',
      },
    },
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${interTight.variable} ${plexMono.variable} min-h-screen bg-white antialiased`}>
        <GoogleAnalytics />
        {isClerkConfigured ? (
          <ClerkProvider>
            <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          </ClerkProvider>
        ) : (
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        )}
      </body>
    </html>
  );
}

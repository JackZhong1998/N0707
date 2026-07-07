import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ClerkProvider } from '@clerk/nextjs';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import { routing } from '@/i18n/routing';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { getBaseUrl, getSiteName } from '@/lib/seo';

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: `${getSiteName()} — 30-Day GTM Action Calendar`,
      template: `%s | ${getSiteName()}`,
    },
    applicationName: getSiteName(),
    keywords: [
      'GTM tool',
      'go-to-market software',
      'product launch calendar',
      'first users',
      'marketing calendar for founders',
      'indie hacker marketing',
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
    },
    twitter: {
      card: 'summary_large_image',
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
    <div className={`${jakarta.variable} ${dmSans.variable} min-h-screen bg-white antialiased`}>
      <GoogleAnalytics />
      {isClerkConfigured ? (
        <ClerkProvider>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ClerkProvider>
      ) : (
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      )}
    </div>
  );
}

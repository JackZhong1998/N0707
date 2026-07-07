import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'zh' ? '注册' : 'Sign Up',
    description: locale === 'zh' ? '创建新的账户。' : 'Create your account.',
    alternates: {
      canonical: `/${locale}/sign-up`,
      languages: { en: '/en/sign-up', zh: '/zh/sign-up' },
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default async function SignUpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <SignUp
        fallbackRedirectUrl={`/${locale}/workspace`}
        signInFallbackRedirectUrl={`/${locale}/workspace`}
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl border border-gray-100 rounded-2xl',
          },
        }}
      />
    </div>
  );
}

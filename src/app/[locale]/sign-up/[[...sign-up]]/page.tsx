import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { languageAlternates, localePath } from '@/lib/seo';

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'zh' ? '注册' : 'Sign Up',
    description: locale === 'zh' ? '创建 NowBuild 账户，免费生成你的冷启动简报。' : 'Create your account.',
    alternates: {
      canonical: localePath(locale, '/sign-up'),
      languages: languageAlternates('/sign-up'),
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
  const afterAuthUrl = localePath(locale, '/app');

  if (!isClerkConfigured) {
    redirect(localePath(locale, '/sign-in'));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-dim px-4">
      <SignUp
        fallbackRedirectUrl={afterAuthUrl}
        forceRedirectUrl={afterAuthUrl}
        signInFallbackRedirectUrl={afterAuthUrl}
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

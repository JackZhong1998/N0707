import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';
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
    title: locale === 'zh' ? '登录' : 'Sign In',
    description: locale === 'zh' ? '登录 NowBuild，继续推进你的产品冷启动。' : 'Sign in to your account.',
    alternates: {
      canonical: localePath(locale, '/sign-in'),
      languages: languageAlternates('/sign-in'),
    },
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const afterAuthUrl = localePath(locale, '/app');

  // Clerk 未配置（本地演示）：模拟登录，直接进入产品内页
  if (!isClerkConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night px-4">
        <div className="w-full max-w-sm border border-zinc-800 bg-night p-8">
          <p className="index-label !text-zinc-500">NowBuild</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
            {isZh ? '登录' : 'Sign in'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {isZh
              ? '当前为演示模式，点击下方按钮即可直接进入工作台。'
              : 'Demo mode: auth is not configured. Continue straight in.'}
          </p>
          <Link
            href={afterAuthUrl}
            className="mt-8 flex h-12 w-full items-center justify-center bg-white text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '进入 NowBuild →' : 'Enter NowBuild →'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-dim px-4">
      <SignIn
        fallbackRedirectUrl={afterAuthUrl}
        signUpFallbackRedirectUrl={afterAuthUrl}
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

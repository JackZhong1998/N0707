'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';

const isClerkConfigured =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

function AuthButtons({
  signInLabel,
  getStartedLabel,
  dark,
}: {
  signInLabel: string;
  getStartedLabel: string;
  dark: boolean;
}) {
  const ghost = dark
    ? 'rounded-full px-3.5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white'
    : 'rounded-full px-3.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-ink';
  const solid = dark
    ? 'rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200'
    : 'rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700';

  if (!isClerkConfigured) {
    return (
      <>
        <Link href="/sign-in" className={ghost}>
          {signInLabel}
        </Link>
        <Link href="/sign-in" className={solid}>
          {getStartedLabel}
        </Link>
      </>
    );
  }

  return (
    <>
      <SignedOut>
        <Link href="/sign-in" className={ghost}>
          {signInLabel}
        </Link>
        <Link href="/sign-up" className={solid}>
          {getStartedLabel}
        </Link>
      </SignedOut>
      <SignedIn>
        <Link href="/app" className={ghost}>
          {signInLabel === '登录' ? '进入工作台' : 'Open app'}
        </Link>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}

export default function Navbar({ variant = 'light' }: { variant?: 'dark' | 'light' }) {
  const t = useTranslations('Nav');
  const [mobileOpen, setMobileOpen] = useState(false);
  const dark = variant === 'dark';

  const navLinks = [
    { href: '/#channels', label: t('features') },
    { href: '/pricing', label: t('pricing') },
    { href: '/blog', label: t('blog') },
    { href: '/about', label: t('about') },
  ];

  const linkCls = dark
    ? 'rounded-full px-3.5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white'
    : 'rounded-full px-3.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-ink';

  return (
    <header
      className={
        dark
          ? 'fixed top-0 z-50 w-full border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl'
          : 'fixed top-0 z-50 w-full border-b border-hairline bg-white/85 backdrop-blur-xl'
      }
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/">
          <Logo dark={dark} />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkCls}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher dark={dark} />
          <AuthButtons signInLabel={t('signIn')} getStartedLabel={t('getStarted')} dark={dark} />
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`inline-flex items-center justify-center p-2 md:hidden ${
            dark ? 'text-zinc-300' : 'text-zinc-500'
          }`}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            )}
          </svg>
        </button>
      </nav>

      {mobileOpen && (
        <div
          className={
            dark
              ? 'border-t border-white/10 bg-[#0a0a0a] px-5 py-4 md:hidden'
              : 'border-t border-hairline bg-white px-5 py-4 md:hidden'
          }
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 text-sm font-medium ${
                  dark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div
            className={`mt-4 flex flex-col gap-2 border-t pt-4 ${
              dark ? 'border-white/10' : 'border-hairline'
            }`}
          >
            <LanguageSwitcher dark={dark} />
            <AuthButtons signInLabel={t('signIn')} getStartedLabel={t('getStarted')} dark={dark} />
          </div>
        </div>
      )}
    </header>
  );
}

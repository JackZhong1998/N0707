'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';

const isClerkConfigured =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

function AuthButtons({ signInLabel, getStartedLabel }: { signInLabel: string; getStartedLabel: string }) {
  if (!isClerkConfigured) {
    return (
      <>
        <Link href="/sign-in" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
          {signInLabel}
        </Link>
        <Link href="/sign-up" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md">
          {getStartedLabel}
        </Link>
      </>
    );
  }

  return (
    <>
      <SignedOut>
        <Link href="/sign-in" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
          {signInLabel}
        </Link>
        <Link href="/sign-up" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md">
          {getStartedLabel}
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/workspace"
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          {signInLabel === '登录' ? '进入行动台' : 'Workspace'}
        </Link>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}

export default function Navbar() {
  const t = useTranslations('Nav');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/#features', label: t('features') },
    { href: '/pricing', label: t('pricing') },
    { href: '/blog', label: t('blog') },
    { href: '/about', label: t('about') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            N
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-gray-900">
            NowBuild
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <AuthButtons signInLabel={t('signIn')} getStartedLabel={t('getStarted')} />
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
            <LanguageSwitcher />
            <AuthButtons signInLabel={t('signIn')} getStartedLabel={t('getStarted')} />
          </div>
        </div>
      )}
    </header>
  );
}

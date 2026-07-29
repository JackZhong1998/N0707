'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Logo from '@/components/Logo';
import { BRAND_MISSION } from '@/lib/brand';

export default function Footer() {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t('product'),
      links: [
        { label: t('features'), href: '/#agent-team' },
        { label: t('directories'), href: '/directories' },
        { label: t('pricing'), href: '/pricing' },
        { label: t('campaign'), href: '/30-day-campaign' },
      ],
    },
    {
      title: t('company'),
      links: [
        { label: t('about'), href: '/about' },
        { label: t('blog'), href: '/blog' },
      ],
    },
    {
      title: t('legal'),
      links: [
        { label: t('privacy'), href: '/privacy' },
        { label: t('terms'), href: '/terms' },
      ],
    },
  ];

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
              {t('description')}
            </p>
            <p className="mt-4 max-w-sm font-mono text-[10px] uppercase leading-5 tracking-[.14em] text-gray-400">
              {BRAND_MISSION}
            </p>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-gray-900">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 transition-colors hover:text-gray-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-center text-sm text-gray-400">
            {t('copyright', { year: String(year) })}
          </p>
        </div>
      </div>
    </footer>
  );
}

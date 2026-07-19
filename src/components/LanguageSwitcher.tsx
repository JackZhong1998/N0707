'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  zh: '中文',
};

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function handleSwitch(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleSwitch(loc)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            locale === loc
              ? dark
                ? 'bg-white/15 text-white'
                : 'bg-paper-dim text-ink'
              : dark
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-zinc-400 hover:text-ink'
          }`}
        >
          {localeLabels[loc]}
        </button>
      ))}
    </div>
  );
}

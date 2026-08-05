'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const localeLabels: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
};

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export default function LanguageSwitcher({
  dark = false,
  variant = 'default',
}: {
  dark?: boolean;
  variant?: 'default' | 'sidebar';
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleSwitch(newLocale: Locale) {
    setOpen(false);
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
  }

  const triggerCls =
    variant === 'sidebar'
      ? 'inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-white'
      : dark
        ? 'inline-flex h-9 w-9 -mr-2 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white'
        : 'inline-flex h-9 w-9 -mr-2 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-paper-dim hover:text-ink';

  const panelCls =
    variant === 'sidebar'
      ? 'absolute bottom-0 left-full z-50 ml-2 min-w-[9.5rem] overflow-hidden rounded-xl border border-white/10 bg-night py-1 shadow-xl'
      : dark
        ? 'absolute right-0 z-50 mt-2 min-w-[9.5rem] overflow-hidden rounded-xl border border-white/10 bg-night py-1 shadow-xl'
        : 'absolute right-0 z-50 mt-2 min-w-[9.5rem] overflow-hidden rounded-xl border border-hairline bg-white py-1 shadow-lg';

  const optionBase = dark
    ? 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
    : 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerCls}
        aria-label={locale === 'zh' ? '切换语言' : 'Switch language'}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <GlobeIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className={panelCls} role="listbox" aria-label={locale === 'zh' ? '选择语言' : 'Select language'}>
          {routing.locales.map((loc) => {
            const selected = locale === loc;
            return (
              <button
                key={loc}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => handleSwitch(loc)}
                className={`${optionBase} ${
                  selected
                    ? dark
                      ? 'bg-white/10 text-white'
                      : 'bg-paper-dim text-ink'
                    : dark
                      ? 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      : 'text-zinc-600 hover:bg-paper-dim hover:text-ink'
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {selected ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                </span>
                <span>{localeLabels[loc]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

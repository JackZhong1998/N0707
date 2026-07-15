'use client';

/**
 * 产品内页外壳
 * - 顶部：Logo + 用户头像
 * - 分隔线下方：左右结构 — 左侧三个功能入口（市场总监对话 / 每日行动日历 / 市场策略文档）
 * - 移动端：底部标签栏
 * - 支付墙前置：未支付时锁定在日历页（模拟效果 + 蒙版）
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { UserButton } from '@clerk/nextjs';
import { Link, useRouter } from '@/i18n/navigation';
import Logo from '@/components/Logo';
import { GtmProvider, useGtm } from '@/lib/gtm/store';

const isClerkConfigured =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx');

function NavIcon({ name, className }: { name: 'chat' | 'calendar' | 'strategy'; className?: string }) {
  const cls = className ?? 'h-[18px] w-[18px]';
  if (name === 'chat') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h5.25M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function AvatarFallback() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
      U
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const { store, hydrated } = useGtm();

  const items = [
    { key: 'chat', href: '/app/chat', label: isZh ? '市场总监' : 'Director', icon: 'chat' as const },
    { key: 'calendar', href: '/app/calendar', label: isZh ? '行动日历' : 'Calendar', icon: 'calendar' as const },
    { key: 'strategy', href: '/app/strategy', label: isZh ? '市场策略' : 'Strategy', icon: 'strategy' as const },
  ];

  const activeKey = pathname.includes('/app/chat')
    ? 'chat'
    : pathname.includes('/app/strategy')
      ? 'strategy'
      : 'calendar';

  // 支付墙前置：未支付时只能停在日历页（模拟效果页）
  useEffect(() => {
    if (!hydrated) return;
    if (!store.paid && activeKey !== 'calendar') {
      router.replace('/app/calendar');
    }
  }, [hydrated, store.paid, activeKey, router]);

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      {/* 顶部导航栏：Logo + 头像 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          {store.planReady && (
            <span className="index-label hidden sm:inline">
              {isZh ? '30 天冷启动进行中' : '30-day launch in progress'}
            </span>
          )}
          {isClerkConfigured ? <UserButton afterSignOutUrl="/" /> : <AvatarFallback />}
        </div>
      </header>

      {/* 导航栏下方：左右结构功能区 */}
      <div className="flex min-h-0 flex-1">
        {/* 左侧功能入口（桌面端） */}
        <nav className="hidden w-52 shrink-0 flex-col border-r border-hairline md:flex">
          <div className="flex-1 space-y-0.5 p-3">
            {items.map((item) => {
              const active = activeKey === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-ink font-medium text-white'
                      : 'text-ink-soft hover:bg-paper-dim hover:text-ink'
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-hairline p-3">
            <p className="index-label">NowBuild GTM</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              {isZh ? '对话 · 策略 · 执行' : 'Talk · Strategy · Execute'}
            </p>
          </div>
        </nav>

        {/* 内容区 */}
        <main className="min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>

      {/* 移动端底部标签栏 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-hairline bg-white/95 backdrop-blur md:hidden">
        {items.map((item) => {
          const active = activeKey === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                active ? 'text-ink' : 'text-zinc-400'
              }`}
            >
              <NavIcon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GtmProvider>
      <ShellInner>{children}</ShellInner>
    </GtmProvider>
  );
}

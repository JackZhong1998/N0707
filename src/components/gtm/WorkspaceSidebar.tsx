'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { UserButton } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import { CAMPAIGN_DURATION_DAYS } from '@/lib/gtm/types';
import { LogoMark } from '@/components/Logo';

function IconToday({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" strokeLinecap="round" />
      <path d="M7.5 12.5l2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" strokeLinecap="round" />
      <circle cx="7" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="7" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconStrategy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M10 3.5l6.5 3.25L10 10 3.5 6.75 10 3.5z" strokeLinejoin="round" />
      <path d="M3.5 10.25L10 13.5l6.5-3.25M3.5 13.75L10 17l6.5-3.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconReport({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 16.5V12M8 16.5V8.5M12 16.5V11M16 16.5V5.5" strokeLinecap="round" />
    </svg>
  );
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated } = useGtm();

  const inExecution = state.phase === 'execution' || state.phase === 'review';
  const dayIndex = state.currentDayIndex;

  const navItems = [
    {
      href: '/workspace/marketing/today',
      label: isZh ? '今日行动' : 'Today',
      icon: IconToday,
      exact: false,
    },
    {
      href: '/workspace/marketing/calendar',
      label: isZh ? '作战日历' : 'Calendar',
      icon: IconCalendar,
      exact: false,
    },
    {
      href: '/workspace/marketing/strategy',
      label: isZh ? '市场策略' : 'Strategy',
      icon: IconStrategy,
      exact: false,
    },
    {
      href: '/workspace/marketing/review/week-1',
      label: isZh ? '战报' : 'Reports',
      icon: IconReport,
      exact: false,
      hidden: !inExecution || dayIndex < 7,
    },
  ];

  // 精确高亮：取匹配路径中最长的一个，杜绝多项同时亮起
  const matched = navItems
    .filter((item) => !item.hidden)
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];

  // 任务详情页归属「今日行动」
  const activeHref = pathname.startsWith('/workspace/marketing/tasks')
    ? '/workspace/marketing/today'
    : pathname.startsWith('/workspace/marketing/review')
      ? '/workspace/marketing/review/week-1'
      : matched?.href;

  const doneCount = state.unifiedCalendar
    .flatMap((d) => d.tasks)
    .filter((t) => t.status === 'done').length;

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-gray-200/80 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <LogoMark size={32} />
        <div>
          <p className="font-display text-sm font-bold leading-tight text-gray-900">NowBuild</p>
          <p className="text-[11px] leading-tight text-gray-400">
            {isZh ? 'GTM 行动台' : 'GTM Action OS'}
          </p>
        </div>
      </div>

      {/* Campaign progress */}
      {hydrated && inExecution && (
        <div className="mx-3 mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-gray-500">
              {isZh ? '30 天战役' : '30-day campaign'}
            </span>
            <span className="font-display text-sm font-bold text-gray-900">
              D{dayIndex}
              <span className="text-xs font-normal text-gray-400">/{CAMPAIGN_DURATION_DAYS}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-900 transition-all"
              style={{ width: `${Math.min((dayIndex / CAMPAIGN_DURATION_DAYS) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {isZh ? `已完成 ${doneCount} 个推广动作` : `${doneCount} actions completed`}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {navItems
          .filter((item) => !item.hidden)
          .map((item) => {
            const active = activeHref === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}
                />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Methodology trust footer */}
      <div className="mx-3 mb-3 rounded-xl border border-gray-100 p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {isZh ? '方法论驱动' : 'Playbook-driven'}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
          {isZh
            ? '策略源自 40+ 实战增长 Playbook，覆盖 PH 日榜冲顶、开源 0→60K stars 等真实案例。'
            : 'Strategies built on 40+ battle-tested growth playbooks incl. PH #1 launches.'}
        </p>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-3.5">
        <UserButton afterSignOutUrl="/" />
        <span className="text-xs text-gray-400">{isZh ? '账户' : 'Account'}</span>
      </div>
    </aside>
  );
}

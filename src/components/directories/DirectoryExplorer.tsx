'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { launchDirectories } from '@/lib/directories/data';
import { getDirectoryFitProfile } from '@/lib/directories/fit-profiles';

type Locale = 'en' | 'zh';
type PricingFilter = 'all' | 'free' | 'freemium' | 'paid';
type LinkFilter = 'all' | 'dofollow' | 'nofollow';
type SortOption = 'recommended' | 'dr' | 'popular' | 'name';

const copy = {
  en: {
    eyebrow: 'Free founder resource · 2026 edition',
    titleA: 'Put your product',
    titleB: 'where people look.',
    intro: 'A practical index of launch platforms, startup communities, and software directories. Search the list, find the right fit, and go straight to the site.',
    platforms: 'platforms',
    freeOptions: 'with a free option',
    followLinks: 'dofollow links',
    searchLabel: 'Search directories',
    searchPlaceholder: 'Search by platform, domain, or category…',
    pricing: 'Pricing',
    linkType: 'Link type',
    sort: 'Sort',
    all: 'All',
    free: 'Free',
    freemium: 'Free + paid',
    paid: 'Paid',
    dofollow: 'Dofollow',
    nofollow: 'Nofollow',
    recommended: 'Recommended',
    drHigh: 'Highest DR',
    popular: 'Most saved',
    az: 'A–Z',
    results: 'results',
    showing: 'Showing',
    reset: 'Reset filters',
    visit: 'Visit site',
    dr: 'DR',
    votes: 'saves',
    loadMore: 'Show more platforms',
    emptyTitle: 'No matching platforms',
    emptyBody: 'Try a broader keyword or reset the filters.',
    sourceLead: 'Directory facts sourced from',
    sourceTail: 'on July 22, 2026. Domain ratings, pricing, and link policies can change; confirm details on the destination site before submitting.',
    fitLabel: 'Best fit',
    profiled: 'AI-researched fit',
    explicit: 'Official',
    inferred: 'Inferred',
    catalogInferred: 'Needs verification',
    unverified: 'Official page unavailable',
    verified: 'Checked',
    guideTitle: 'Start with a focused launch list',
    guideBody: 'Pick 10–15 relevant, high-quality platforms first. Prepare one consistent product kit—name, URL, short description, logo, screenshots, pricing, and founder details—then tailor each submission.',
    tagNames: {
      launchpad: 'Launch',
      community: 'Community',
      ai: 'AI',
      tools: 'Tools',
      'software directory': 'Software',
      deals: 'Deals',
    },
  },
  zh: {
    eyebrow: '独立开发者免费资源 · 2026 年更新',
    titleA: '把产品放到',
    titleB: '用户正在寻找的地方。',
    intro: '我们整理了值得关注的产品发布平台、创业社区和软件目录。按条件筛选，找到真正适合你的渠道，再直接前往提交。',
    platforms: '个平台',
    freeOptions: '个提供免费选项',
    followLinks: '个可传递权重的外链',
    searchLabel: '搜索目录',
    searchPlaceholder: '输入平台名称、域名或类别…',
    pricing: '费用',
    linkType: '链接类型',
    sort: '排序',
    all: '全部',
    free: '免费',
    freemium: '免费增值',
    paid: '付费',
    dofollow: 'Dofollow',
    nofollow: 'Nofollow',
    recommended: '综合推荐',
    drHigh: 'DR 从高到低',
    popular: '收藏最多',
    az: '名称 A–Z',
    results: '项结果',
    showing: '已显示',
    reset: '清除筛选',
    visit: '前往平台',
    dr: 'DR',
    votes: '人收藏',
    loadMore: '查看更多平台',
    emptyTitle: '暂时没有符合条件的平台',
    emptyBody: '可以换个更宽泛的关键词，或清除筛选后再试。',
    sourceLead: '目录信息整理自',
    sourceTail: '，数据采集于 2026 年 7 月 22 日。域名评级、费用与链接政策可能随时变化，请在提交前前往目标网站确认。',
    fitLabel: '更适合',
    profiled: 'AI 调研',
    explicit: '官方信息',
    inferred: '根据平台定位判断',
    catalogInferred: '仍需逐站确认',
    unverified: '暂未通过官网核实',
    verified: '核实时间',
    guideTitle: '别急着全投，先挑对平台',
    guideBody: '建议先选 10–15 个相关度高、质量可靠的平台。统一备好产品名称、网址、简短介绍、Logo、截图、价格与创始人信息，再根据每个平台的要求分别调整。',
    tagNames: {
      launchpad: '产品首发',
      community: '社区',
      ai: 'AI',
      tools: '工具',
      'software directory': '软件目录',
      deals: '优惠',
    },
  },
} as const;

const PAGE_SIZE = 30;

function initials(name: string) {
  return name
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export default function DirectoryExplorer({ locale }: { locale: string }) {
  const language: Locale = locale === 'zh' ? 'zh' : 'en';
  const t = copy[language];
  const [query, setQuery] = useState('');
  const [pricing, setPricing] = useState<PricingFilter>('all');
  const [linkType, setLinkType] = useState<LinkFilter>('all');
  const [sort, setSort] = useState<SortOption>('recommended');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const freeCount = launchDirectories.filter(
    (item) => item.pricing === 'Free' || item.pricing === 'Free + Paid',
  ).length;
  const dofollowCount = launchDirectories.filter((item) => item.dofollow).length;

  const filteredDirectories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return launchDirectories
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            item.name,
            item.domain,
            ...item.tags,
            ...getDirectoryFitProfile(item).productTypes,
            ...getDirectoryFitProfile(item).audiences,
            ...getDirectoryFitProfile(item).stages,
          ].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          );
        const matchesPricing =
          pricing === 'all' ||
          (pricing === 'free' && item.pricing === 'Free') ||
          (pricing === 'freemium' && item.pricing === 'Free + Paid') ||
          (pricing === 'paid' && item.pricing === 'Paid');
        const matchesLink =
          linkType === 'all' ||
          (linkType === 'dofollow' && item.dofollow) ||
          (linkType === 'nofollow' && !item.dofollow);

        return matchesQuery && matchesPricing && matchesLink;
      })
      .sort((a, b) => {
        if (sort === 'dr') return b.dr - a.dr || a.name.localeCompare(b.name);
        if (sort === 'popular') return b.upvotes - a.upvotes || b.dr - a.dr;
        if (sort === 'name') return a.name.localeCompare(b.name);
        return a.sourceOrder - b.sourceOrder;
      });
  }, [linkType, pricing, query, sort]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [linkType, pricing, query, sort]);

  const resetFilters = () => {
    setQuery('');
    setPricing('all');
    setLinkType('all');
    setSort('recommended');
  };

  return (
    <main className="min-h-screen bg-zinc-50 pt-16">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,223,93,0.22),_transparent_55%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_300px] lg:items-end lg:gap-12 lg:py-28">
          <div>
            <p className="mb-7 inline-flex items-center rounded-full bg-white/80 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted shadow-sm ring-1 ring-zinc-200/80">
              {t.eyebrow}
            </p>
            <h1 className="max-w-5xl font-display text-5xl font-semibold tracking-[-0.055em] text-ink sm:text-6xl lg:text-[5.15rem] lg:leading-[0.95]">
              {t.titleA}
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">{t.titleB}</span>
                <span className="absolute bottom-[0.06em] left-0 h-[0.18em] w-full rounded-full bg-brand-500" />
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-7 text-ink-muted sm:text-lg">
              {t.intro}
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-2.5 lg:grid-cols-1">
            {[
              [launchDirectories.length, t.platforms],
              [freeCount, t.freeOptions],
              [dofollowCount, t.followLinks],
            ].map(([value, label]) => (
              <div
                key={String(label)}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/80 sm:p-5"
              >
                <dt className="text-[10px] leading-4 text-ink-muted sm:text-xs">{label}</dt>
                <dd className="mt-1 font-mono text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="sticky top-16 z-30 px-5 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] bg-white/90 p-4 shadow-lg shadow-zinc-900/5 ring-1 ring-zinc-200/80 backdrop-blur-xl sm:p-5">
          <label className="block" htmlFor="directory-search">
            <span className="sr-only">{t.searchLabel}</span>
            <input
              id="directory-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-12 w-full rounded-2xl bg-zinc-50 px-4 text-base text-ink outline-none ring-1 ring-zinc-200/80 transition-shadow placeholder:text-ink-faint focus:bg-white focus:ring-2 focus:ring-ink/20"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              <FilterGroup
                label={t.pricing}
                value={pricing}
                onChange={(value) => setPricing(value as PricingFilter)}
                options={[
                  ['all', t.all],
                  ['free', t.free],
                  ['freemium', t.freemium],
                  ['paid', t.paid],
                ]}
              />
              <FilterGroup
                label={t.linkType}
                value={linkType}
                onChange={(value) => setLinkType(value as LinkFilter)}
                options={[
                  ['all', t.all],
                  ['dofollow', t.dofollow],
                  ['nofollow', t.nofollow],
                ]}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <span>{t.sort}</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="h-9 rounded-full bg-zinc-50 px-3.5 text-sm font-medium text-ink outline-none ring-1 ring-zinc-200/80 focus:ring-2 focus:ring-ink/20"
              >
                <option value="recommended">{t.recommended}</option>
                <option value="dr">{t.drHigh}</option>
                <option value="popular">{t.popular}</option>
                <option value="name">{t.az}</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <p className="rounded-full bg-white px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-ink-muted shadow-sm ring-1 ring-zinc-200/80">
            {filteredDirectories.length} {t.results}
          </p>
          {(query || pricing !== 'all' || linkType !== 'all' || sort !== 'recommended') && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-white hover:text-ink"
            >
              {t.reset}
            </button>
          )}
        </div>

        {filteredDirectories.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDirectories.slice(0, visibleCount).map((directory, index) => {
                const fit = getDirectoryFitProfile(directory);
                return (
                <a
                  key={`${directory.domain}-${directory.sourceOrder}`}
                  href={directory.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-72 flex-col rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:p-6"
                  aria-label={`${t.visit}: ${directory.name}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50 font-mono text-xs font-medium text-ink ring-1 ring-zinc-200/80">
                        <span aria-hidden="true">{initials(directory.name)}</span>
                        {directory.image && (
                          <img
                            src={directory.image}
                            alt=""
                            width={44}
                            height={44}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 h-full w-full bg-white object-contain p-1.5"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-tight text-ink">
                          {directory.name}
                        </h2>
                        <p className="truncate font-mono text-[11px] text-ink-muted">{directory.domain}</p>
                        {fit && (
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-wide text-emerald-700">
                            {t.profiled} · {fit.evidenceLevel === 'explicit'
                              ? t.explicit
                              : fit.evidenceLevel === 'inferred'
                                ? t.inferred
                                : fit.evidenceLevel === 'unverified'
                                  ? t.unverified
                                  : t.catalogInferred}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-xs text-ink-faint">
                      {String(index + 1).padStart(3, '0')}
                    </span>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-1.5">
                    <Tag>{directory.pricing === 'Free + Paid' ? t.freemium : directory.pricing === 'Unknown' ? '—' : directory.pricing === 'Free' ? t.free : t.paid}</Tag>
                    <Tag dark={directory.dofollow}>{directory.dofollow ? t.dofollow : t.nofollow}</Tag>
                    {directory.tags.slice(0, 2).map((tag) => (
                      <Tag key={tag}>{t.tagNames[tag as keyof typeof t.tagNames] ?? tag}</Tag>
                    ))}
                  </div>

                  {fit && (
                    <div className="mt-5 border-t border-zinc-100 pt-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                        {t.fitLabel}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-ink">
                        {fit.summary[language]}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {fit.productTypes.slice(0, 2).map((type) => (
                          <Tag key={type}>{type}</Tag>
                        ))}
                        {fit.audiences.slice(0, 1).map((audience) => (
                          <Tag key={audience}>{audience}</Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex items-end justify-between pt-8">
                    <div className="flex gap-5">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{t.dr}</p>
                        <p className="mt-0.5 font-mono text-lg font-medium text-ink">{directory.dr}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{t.votes}</p>
                        <p className="mt-0.5 font-mono text-lg font-medium text-ink">{directory.upvotes}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {t.visit}
                      <span className="text-base transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span>
                    </span>
                  </div>
                </a>
                );
              })}
            </div>

            {visibleCount < filteredDirectories.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="mt-8 w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-zinc-200/80 transition-all hover:bg-ink hover:text-white hover:ring-ink"
              >
                {t.loadMore} · {t.showing} {Math.min(visibleCount, filteredDirectories.length)}/{filteredDirectories.length}
              </button>
            )}
          </>
        ) : (
          <div className="rounded-[1.75rem] bg-white px-6 py-20 text-center shadow-sm ring-1 ring-zinc-200/80">
            <p className="text-xl font-semibold text-ink">{t.emptyTitle}</p>
            <p className="mt-2 text-sm text-ink-muted">{t.emptyBody}</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              {t.reset}
            </button>
          </div>
        )}
      </section>

      <section className="px-5 pb-6 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] bg-brand-500 p-7 text-night sm:p-10 md:grid-cols-[200px_1fr] md:gap-10 md:p-12">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-night/65">Launch note / 01</p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-night sm:text-3xl">{t.guideTitle}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-night/70 sm:text-base">{t.guideBody}</p>
          </div>
        </div>
      </section>

      <aside className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <p className="rounded-2xl bg-white/70 px-5 py-4 text-xs leading-6 text-ink-muted ring-1 ring-zinc-200/60">
          {t.sourceLead}{' '}
          <a
            href="https://launchdirectories.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink underline decoration-zinc-300 underline-offset-4 hover:decoration-ink"
          >
            LaunchDirectories.com
          </a>
          {t.sourceTail}
        </p>
      </aside>
    </main>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <fieldset className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-50 p-1 ring-1 ring-zinc-200/80">
      <legend className="sr-only">{label}</legend>
      {options.map(([optionValue, optionLabel]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          aria-pressed={value === optionValue}
          className={`h-8 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors ${
            value === optionValue ? 'bg-ink text-white shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {optionLabel}
        </button>
      ))}
    </fieldset>
  );
}

function Tag({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide ${
        dark ? 'bg-ink text-white' : 'bg-zinc-100 text-ink-muted'
      }`}
    >
      {children}
    </span>
  );
}

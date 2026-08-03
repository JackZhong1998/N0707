'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import {
  createLaunchFromDocument,
  createLaunchSkeleton,
  storePatchForNewLaunch,
} from '@/lib/gtm/launch';
import {
  runFreeLaunchResearch,
  runFreeMarketStrategyReport,
} from '@/lib/gtm/free-launch-research';
import { buildDirectoryLaunchKit } from '@/lib/directories/materials';
import {
  collectSiteAssetsFromServer,
  mergeWebsiteAssets,
  mergeWebsiteSocialLinks,
} from '@/lib/gtm/site-assets';
import type { LaunchState } from '@/lib/gtm/types';
import { parseTargetMarkets } from '@/lib/gtm/target-markets';

const RECOMMENDED_PROJECT_DOCUMENT_LENGTH = 5000;
const MAX_PROJECT_DOCUMENT_LENGTH = 6000;
const MAX_TARGET_MARKETS_LENGTH = 2000;

function validPublicUrl(raw: string): string | null {
  try {
    const normalized = /^https?:\/\//i.test(raw.trim())
      ? raw.trim()
      : `https://${raw.trim()}`;
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function projectDocumentPrompt(isZh: boolean): string {
  if (!isZh) {
    return `Please thoroughly inspect this product's codebase, README, UI, routes, data model, configuration, and existing product context. Then create a detailed, factual Markdown Project Document for a go-to-market planning agent.

Include:
1. Product overview: product name, public domain/URL, current stage, product category, business model, and pricing visible in the product.
2. Positioning and users: one-line positioning; primary and secondary users; their scenarios, pains, current alternatives, buying triggers, and objections.
3. Detailed capabilities: group the product into functional modules. For every important capability, explain what it does, who uses it, its input and output, the operating steps, the problem it solves, and the resulting user value. Do not merely repeat feature names.
4. Product experience: describe the end-to-end user journey and key interactions from first visit/onboarding through the core task and final result. Include important pages, states, automation, collaboration, integrations, and conversion points when present.
5. Product highlights: identify 5–10 concrete strengths, novel interactions, technical/product advantages, or memorable details. Tie every highlight to visible implementation or product evidence and explain why a user would care.
6. Competitor research: use web search to find 3–5 current direct competitors and meaningful substitutes. Include source links, positioning, target users, pricing when verifiable, key differences, and where this product is stronger or weaker. Do not invent competitor facts; label anything that cannot be verified.

Rules:
- Inspect actual implementation before writing. Use repository/product evidence for product claims and web sources for competitor claims. Label every inference as an assumption.
- Do not write the marketing plan yet.
- Make the document self-contained so I can paste it into another platform.
- Write at least 1,000 characters and no more than 5,000 characters, including Markdown headings and punctuation. Prefer useful specifics over generic descriptions.`;
  }
  return `请深入阅读这个产品的代码库、README、页面、路由、数据结构、配置以及已有产品上下文，生成一份可直接交给市场推广 Agent 的详细 Markdown《项目文档》。

文档必须包含：
1. 产品概览：产品名、公开域名/链接、当前阶段、产品类别、商业模式，以及产品中能够确认的定价。
2. 定位与用户：一句话定位；主要和次要目标人群；他们的使用场景、痛点、当前替代方案、购买动机与常见异议。
3. 详细功能说明：按功能模块组织。每个重要功能都要说明它做什么、谁会使用、输入和输出、具体操作步骤、解决的问题以及带来的用户价值，不能只罗列功能名称。
4. 产品体验与交互：从首次访问/初始化开始，描述用户完成核心任务直到获得结果的完整路径；说明关键页面、状态变化、自动化、协作、集成和转化节点（如果产品中存在）。
5. 功能亮点与差异化：总结 5–10 个有产品依据的亮点、创新交互、技术/产品优势或容易被用户记住的细节，并解释每个亮点为什么对用户重要。
6. 竞品调研：允许并要求使用联网搜索，寻找 3–5 个当前仍活跃的直接竞品和重要替代方案。附来源链接，并对比定位、目标用户、可核实的定价、核心差异，以及本产品相对更强或更弱的地方。不得编造竞品信息，无法核实的内容要明确标注。

要求：
- 写作前先检查实际实现。产品判断使用代码库/产品证据，竞品判断使用搜索来源；推断必须明确标为“假设”。
- 现在不要生成市场推广计划。
- 文档必须自包含，方便我完整复制到另一个平台。
- 完整 Markdown 文档不少于 1000 字、不超过 5000 字，标题和标点也计入；优先保留具体事实、功能细节和对比信息，避免空泛描述。`;
}

export default function LaunchOnboarding() {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const router = useRouter();
  const gtm = useGtm();
  const [mode, setMode] = useState<'document' | 'website'>('document');
  const [document, setDocument] = useState('');
  const [targetMarketsText, setTargetMarketsText] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => projectDocumentPrompt(isZh), [isZh]);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const saveCollectedDirectoryKit = (
    completedLaunch: LaunchState,
    collected: Awaited<ReturnType<typeof collectSiteAssetsFromServer>>
  ) => {
    let kit = buildDirectoryLaunchKit(completedLaunch);
    kit = mergeWebsiteSocialLinks(kit, collected.socialLinks);
    kit = {
      ...kit,
      assets: mergeWebsiteAssets(kit.assets, collected.assets),
    };
    const launchWithKit: LaunchState = {
      ...completedLaunch,
      directoryLaunchKit: kit,
      project: { ...completedLaunch.project, updatedAt: Date.now() },
    };
    gtm.update({ launch: launchWithKit });
    return launchWithKit;
  };

  const handleDocumentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (starting) return;
    const projectDocument = document.trim();
    if (!projectDocument) {
      setError(isZh ? '请先粘贴项目文档。' : 'Paste your project document first.');
      return;
    }
    if (projectDocument.length > MAX_PROJECT_DOCUMENT_LENGTH) {
      setError(isZh ? '项目文档不能超过 6000 字。' : 'The project document must be no longer than 6,000 characters.');
      return;
    }
    const targetMarkets = parseTargetMarkets(targetMarketsText, locale);
    if (targetMarkets.length === 0) {
      setError(isZh ? '请至少填写一个目标市场。' : 'Add at least one target market.');
      return;
    }
    const enteredUrl = url.trim() ? validPublicUrl(url) : null;
    if (url.trim() && !enteredUrl) {
      setError(isZh ? '请输入一个可公开访问的产品链接。' : 'Enter a publicly accessible product URL.');
      return;
    }
    setError('');
    setStarting(true);
    const marketSection = `${isZh ? '## 用户确认的目标市场' : '## User-confirmed target markets'}\n${targetMarkets
      .map((market) => `- ${market.name} | ${market.language} (${market.locale})${market.audience ? ` | ${market.audience}` : ''}`)
      .join('\n')}`;
    const enrichedProjectDocument = `${projectDocument}\n\n${marketSection}`;
    const launch = createLaunchFromDocument(enrichedProjectDocument, isZh, enteredUrl ?? undefined);
    const assetCollection = launch.project.productUrl
      ? collectSiteAssetsFromServer(launch.project.productUrl).catch(() => ({ assets: [], socialLinks: {} }))
      : Promise.resolve({ assets: [], socialLinks: {} });
    gtm.update({
      ...storePatchForNewLaunch(launch),
      targetMarkets,
      targetMarketLocale: targetMarkets[0]?.locale.startsWith('zh') ? 'zh' : 'en',
    });
    gtm.setProfiles(gtm.store.userProfileDoc, enrichedProjectDocument);
    gtm.addDirectorMessage({
      role: 'user',
      content: isZh
        ? '这是我从 Coding / AI 平台生成的项目文档。请直接基于它生成免费的 30 天市场策略报告。'
        : 'Here is the project document generated in my coding/AI platform. Build the free 30-day market strategy report from it.',
      contextRef: { view: 'launch_onboarding', entityType: 'launch_project', entityId: launch.project.id },
    });
    gtm.addDirectorMessage({
      role: 'assistant',
      content: isZh
        ? '项目文档已导入。我会合并产品启动判断、渠道推荐、30 天发布排期和 Directory 提交计划；完成后再由你决定是否组建执行团队。'
        : 'Project document imported. I’ll combine the launch diagnosis, channel recommendations, 30-day publishing schedule, and directory submission plan before you decide whether to assemble the execution team.',
    });
    try {
      const [completedLaunch, collected] = await Promise.all([
        runFreeMarketStrategyReport({ launch, locale, isZh, gtm, projectProfileDoc: enrichedProjectDocument, targetMarkets }),
        assetCollection,
      ]);
      saveCollectedDirectoryKit(completedLaunch, collected);
      router.replace('/app/documents/recommendations');
    } catch (reportError) {
      console.error('Free market strategy report failed:', reportError);
      setError(isZh ? '报告生成失败，项目文档已保留，请稍后重试。' : 'Report generation failed. Your project document is saved; please retry.');
    } finally {
      setStarting(false);
    }
  };

  const handleWebsiteSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (starting) return;
    const productUrl = validPublicUrl(url);
    if (!productUrl) {
      setError(isZh ? '请输入一个可公开访问的产品链接。' : 'Enter a publicly accessible product URL.');
      return;
    }
    const targetMarkets = parseTargetMarkets(targetMarketsText, locale);
    if (targetMarkets.length === 0) {
      setError(isZh ? '请至少填写一个目标市场。' : 'Add at least one target market.');
      return;
    }
    setError('');
    setStarting(true);
    const launch = createLaunchSkeleton(productUrl, isZh);
    const assetCollection = collectSiteAssetsFromServer(productUrl).catch(() => ({ assets: [], socialLinks: {} }));
    gtm.update({
      ...storePatchForNewLaunch(launch),
      targetMarkets,
      targetMarketLocale: targetMarkets[0]?.locale.startsWith('zh') ? 'zh' : 'en',
      projectProfileDoc: `${isZh ? '## 用户确认的目标市场' : '## User-confirmed target markets'}\n${targetMarkets
        .map((market) => `- ${market.name} | ${market.language} (${market.locale})${market.audience ? ` | ${market.audience}` : ''}`)
        .join('\n')}`,
    });
    gtm.addDirectorMessage({
      role: 'user',
      content: isZh ? `请研究这个产品并生成免费的 30 天市场策略报告：${productUrl}` : `Research this product and build the free 30-day market strategy report: ${productUrl}`,
      contextRef: { view: 'launch_onboarding', entityType: 'launch_project', entityId: launch.project.id },
    });
    try {
      const [completedLaunch, collected] = await Promise.all([
        runFreeLaunchResearch({ launch, locale, isZh, gtm, targetMarkets }),
        assetCollection,
      ]);
      saveCollectedDirectoryKit(completedLaunch, collected);
      router.replace('/app/documents/recommendations');
    } catch (researchError) {
      console.error('Free launch research failed:', researchError);
      setError(isZh ? '分析或报告生成失败，请稍后重试。' : 'Analysis or report generation failed. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-full px-5 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-300">
          <span className="h-px w-8 bg-brand-500" />
          {isZh ? '免费 · 无需信用卡' : 'Free · No credit card'}
        </div>
        <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
          {isZh ? '免费获取你的 30 天市场策略报告。' : 'Get your free 30-day market strategy report.'}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-400 sm:text-lg">
          {isZh ? '先让你常用的 Coding / AI 平台整理项目事实，NowBuild 再生成产品启动判断、渠道组合、完整排期和 Directory 提交计划。通常比重新爬取网站更快、更准确。' : 'Let your usual coding/AI platform summarize the product facts first. NowBuild then creates the launch diagnosis, channel mix, complete schedule, and directory submission plan—usually faster and more accurate than crawling from scratch.'}
        </p>

        <div className="mt-8 flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <button type="button" onClick={() => { setMode('document'); setError(''); }} className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${mode === 'document' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
            {isZh ? '推荐：导入项目文档' : 'Recommended: import a project doc'}
          </button>
          <button type="button" onClick={() => { setMode('website'); setError(''); }} className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${mode === 'website' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
            {isZh ? '替代：分析产品链接' : 'Alternative: analyze a URL'}
          </button>
        </div>

        {mode === 'document' ? (
          <form onSubmit={handleDocumentSubmit} className="mt-4 space-y-4">
            <section className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">Step 1</p>
                  <h2 className="mt-2 text-lg font-bold text-white">{isZh ? '复制 Prompt，交给 Codex、Claude Code、Lovable 等平台' : 'Copy the prompt into Codex, Claude Code, Lovable, or your preferred AI'}</h2>
                </div>
                <button type="button" onClick={() => void copyPrompt()} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200">
                  {copied ? (isZh ? '已复制 ✓' : 'Copied ✓') : (isZh ? '复制项目文档 Prompt' : 'Copy project-doc prompt')}
                </button>
              </div>
              <pre className="mt-4 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/35 p-4 text-[11px] leading-5 text-zinc-500">{prompt}</pre>
            </section>

            <section className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">Step 2</p>
              <h2 className="mt-2 text-lg font-bold text-white">{isZh ? '把生成好的项目文档粘贴回来' : 'Paste the generated project document here'}</h2>
              <textarea value={document} maxLength={MAX_PROJECT_DOCUMENT_LENGTH} onChange={(event) => { setDocument(event.target.value.slice(0, MAX_PROJECT_DOCUMENT_LENGTH)); if (error) setError(''); }} rows={10} placeholder={isZh ? '# 产品名称\n\n## 一句话定位\n…' : '# Product name\n\n## Positioning\n…'} className="mt-4 w-full resize-y rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-white/25" />
              <label className="mt-4 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {isZh ? '目标市场（必填；每行一个）' : 'Target markets (required; one per line)'}
                </span>
                <textarea
                  value={targetMarketsText}
                  maxLength={MAX_TARGET_MARKETS_LENGTH}
                  onChange={(event) => { setTargetMarketsText(event.target.value); if (error) setError(''); }}
                  rows={3}
                  placeholder={isZh ? '美国｜英语（美国）｜SaaS 创始人\n加拿大法语区｜法语（加拿大）｜小型企业主' : 'United States | English (US) | SaaS founders\nQuebec | French (Canada) | Small-business owners'}
                  className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-white/25"
                />
                <span className="mt-2 block text-xs leading-5 text-zinc-600">
                  {isZh ? '格式：市场｜发布语言｜目标人群。系统会保存为项目的市场候选，之后每条 To-do 可单独选择。' : 'Format: market | publishing language | audience. Each Todo can choose a different saved market.'}
                </span>
              </label>
              <label className="mt-4 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {isZh ? '产品官网（用于自动采集 Logo 和产品图）' : 'Product website (for automatic logo and product image collection)'}
                </span>
                <input
                  type="text"
                  inputMode="url"
                  value={url}
                  onChange={(event) => { setUrl(event.target.value); if (error) setError(''); }}
                  placeholder={isZh ? 'https://yourproduct.com（可选；文档已包含官网时可留空）' : 'https://yourproduct.com (optional if included in the document)'}
                  className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/25"
                />
                <span className="mt-2 block text-xs leading-5 text-zinc-600">
                  {isZh ? '会与市场策略报告并行采集，不会额外等待。' : 'Assets are collected in parallel with the market strategy report.'}
                </span>
              </label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-600">{isZh ? `已输入 ${document.length} / ${MAX_PROJECT_DOCUMENT_LENGTH} 字 · 建议控制在 ${RECOMMENDED_PROJECT_DOCUMENT_LENGTH} 字内` : `${document.length} / ${MAX_PROJECT_DOCUMENT_LENGTH} characters · ${RECOMMENDED_PROJECT_DOCUMENT_LENGTH} recommended`}</p>
                <button type="submit" disabled={starting || !document.trim() || !targetMarketsText.trim()} className="h-11 rounded-full bg-brand-500 px-6 text-sm font-bold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600">
                  {starting ? (isZh ? '正在生成免费报告…' : 'Building your free report…') : (isZh ? '免费生成市场策略报告 →' : 'Generate my free report →')}
                </button>
              </div>
            </section>
          </form>
        ) : (
          <form onSubmit={handleWebsiteSubmit} className="mt-4 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5 sm:p-6">
            <p className="text-sm leading-6 text-zinc-400">{isZh ? '没有现成项目文档时，我们也可以读取公开网站、调研竞品并生成报告。这个过程通常更慢，且无法看到代码库里的产品事实。' : 'If you do not have a project document, we can read the public website, research competitors, and build the report. This is usually slower and cannot see facts inside your codebase.'}</p>
            <div className={`mt-5 flex flex-col gap-2 rounded-2xl border bg-black/25 p-2.5 sm:flex-row ${error ? 'border-red-500/60' : 'border-white/10 focus-within:border-white/30'}`}>
              <input type="text" inputMode="url" value={url} onChange={(event) => { setUrl(event.target.value); if (error) setError(''); }} placeholder="https://yourproduct.com" className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-white outline-none placeholder:text-zinc-700" />
              <button type="submit" disabled={starting || !url.trim()} className="h-12 shrink-0 rounded-xl bg-white px-6 text-sm font-bold text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600">
                {starting ? (isZh ? '正在研究并生成报告…' : 'Researching…') : (isZh ? '分析链接并生成免费报告 →' : 'Analyze URL & generate report →')}
              </button>
            </div>
            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {isZh ? '目标市场（必填；每行一个）' : 'Target markets (required; one per line)'}
              </span>
              <textarea
                value={targetMarketsText}
                maxLength={MAX_TARGET_MARKETS_LENGTH}
                onChange={(event) => { setTargetMarketsText(event.target.value); if (error) setError(''); }}
                rows={3}
                placeholder={isZh ? '美国｜英语（美国）｜SaaS 创始人' : 'United States | English (US) | SaaS founders'}
                className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-white/25"
              />
            </label>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6">
          <p className="max-w-2xl text-xs leading-5 text-zinc-600">{isZh ? '免费报告包含产品启动判断、推荐渠道与理由、30 天发布排期和 Directory 提交计划。付费只在报告完成后出现，用于构建每天执行的 Launch Agent Team。' : 'The free report includes the launch diagnosis, recommended channels and rationale, 30-day publishing schedule, and directory submission plan. Payment appears only after the report, for daily Agent Team execution.'}</p>
          <Link href="/open-source-saas-starter" className="text-xs font-semibold text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-white">
            {isZh ? '还没有产品？使用开源 SaaS 项目 →' : 'No product yet? Use the open-source SaaS starter →'}
          </Link>
        </div>
      </div>
    </div>
  );
}

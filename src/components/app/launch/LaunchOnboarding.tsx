'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import {
  buildLaunchBrief,
  createLaunchSkeleton,
  createMatchedDirectoryPipeline,
  SUPPORTED_LAUNCH_CHANNELS,
} from '@/lib/gtm/launch';
import { deriveProductFitProfile } from '@/lib/directories/matching';
import { callProductResearch } from '@/lib/gtm/api-client';
import type { LaunchState } from '@/lib/gtm/types';

function validPublicUrl(raw: string): string | null {
  try {
    const normalized = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function LaunchOnboarding() {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const router = useRouter();
  const gtm = useGtm();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const updateLaunch = (launch: LaunchState) => {
    gtm.update({ launch, startDate: launch.project.startDate });
  };

  const setSteps = (
    launch: LaunchState,
    updates: Record<string, { status: LaunchState['researchProgress'][number]['status']; detail?: string }>
  ): LaunchState => ({
    ...launch,
    researchProgress: launch.researchProgress.map((step) =>
      updates[step.id] ? { ...step, ...updates[step.id] } : step
    ),
    project: { ...launch.project, updatedAt: Date.now() },
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (starting) return;
    const productUrl = validPublicUrl(url);
    if (!productUrl) {
      setError(isZh ? '请输入一个可公开访问的产品链接。' : 'Enter a publicly accessible product URL.');
      return;
    }
    // Free tier: research + Launch Brief. Do not check subscription or open paywall here.
    if (gtm.accessStatus === 'checking') {
      setError(
        isZh
          ? '正在确认登录状态，请稍后再试。'
          : 'Checking your session. Try again in a moment.'
      );
      return;
    }
    setError('');
    setStarting(true);

    let launch = createLaunchSkeleton(productUrl, isZh);
    const channelIds = SUPPORTED_LAUNCH_CHANNELS.map((channel) => channel.channelId);
    gtm.setChannels(channelIds);
    updateLaunch(launch);
    gtm.addDirectorMessage({
      role: 'user',
      content: isZh
        ? `请先免费分析这个产品，并生成一份冷启动简报：${productUrl}`
        : `Please free-analyze this product and prepare a Launch Brief: ${productUrl}`,
      contextRef: { view: 'launch_onboarding', entityType: 'launch_project', entityId: launch.project.id },
    });
    gtm.addDirectorMessage({
      role: 'assistant',
      content: isZh
        ? '收到。我会先分析网站、目标用户和竞品，再整理成一份可以随时纠正的冷启动简报。等你确认方向后，再开启完整的 30 天团队。'
        : 'Got it. I’ll study the site, audience, and competitors, then prepare a Launch Brief you can correct. The full 30-day team unlocks after you confirm the Brief.',
    });

    let research = null;
    launch = setSteps(launch, {
      website: { status: 'running', detail: productUrl },
      product: { status: 'running' },
      competitors: { status: 'running' },
    });
    updateLaunch(launch);
    try {
      research = await callProductResearch({ websiteUrl: productUrl, locale });
      launch = {
        ...setSteps(launch, {
          website: { status: 'done' },
          product: { status: 'done' },
          competitors: {
            status: 'done',
            detail: isZh
              ? `已分析 ${research.competitors.length} 个主要竞品`
              : `${research.competitors.length} primary competitors analyzed`,
          },
          audience: { status: 'running' },
        }),
        researchConfidence: research.competitors.length > 0 ? 'high' : 'medium',
        researchSources: research.sources,
      };
      const researchProfile = `${research.productProfileMarkdown}\n\n${research.competitorAnalysisMarkdown}`;
      gtm.setProfiles(gtm.store.userProfileDoc, researchProfile);
    } catch (researchError) {
      launch = {
        ...setSteps(launch, {
          website: {
            status: 'warning',
            detail: isZh
              ? '部分页面读取失败，已使用可用公开信息继续'
              : 'Some pages could not be read; continuing with available public information',
          },
          product: { status: 'done' },
          competitors: {
            status: 'warning',
            detail: isZh ? '竞品置信度较低，不阻塞主流程' : 'Low competitor confidence; launch continues',
          },
          audience: { status: 'running' },
        }),
        researchConfidence: 'low',
      };
      void researchError;
    }
    updateLaunch(launch);

    const brief = buildLaunchBrief(launch, research, isZh);
    const productFit = deriveProductFitProfile({
      category: research?.product?.category,
      targetUsers: research?.product?.targetUsers,
      summary: research?.product?.summary,
      capabilities: research?.product?.capabilities,
      stage: brief.product.stage,
    });
    launch = {
      ...setSteps(launch, {
        audience: { status: 'done' },
        brief: { status: 'done' },
      }),
      brief,
      directories: createMatchedDirectoryPipeline(productFit, isZh),
      briefEditUsed: 0,
      project: { ...launch.project, phase: 'brief_ready', status: 'building', updatedAt: Date.now() },
    };
    updateLaunch(launch);
    gtm.addDirectorMessage({
      role: 'assistant',
      content: isZh
        ? '冷启动简报已经准备好。哪里不准确，直接在右侧告诉我（最多可免费修改 20 次）。确认无误后，点击「组建我的 30 天推广团队」，即可开启完整执行。'
        : 'Your Launch Brief is ready. Tell me on the right what to correct (up to 20 free edits). When ready, tap “Assemble my 30-day Agent Team” to unlock full execution.',
    });
    gtm.addAgentNotification({
      title: isZh ? '冷启动简报已就绪' : 'Launch Brief is ready',
      summary: isZh
        ? '产品分析已经完成。确认并修正简报后，即可开启完整的 30 天执行团队。'
        : 'Product analysis is done. Correct the Brief, then unlock the full 30-day execution team.',
      priority: 'important',
    });
    setStarting(false);
    router.replace('/app/brief');
  };

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-12 sm:px-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          <span className="h-px w-8 bg-brand-500" />
          {isZh ? '从一个产品网址开始' : '30-Day Cold Start'}
        </div>
        <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
          {isZh ? '把你的产品介绍给我们。' : 'What did you build?'}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          {isZh
            ? '粘贴产品链接，我们会免费分析产品、目标用户和竞品，并整理成一份可随时修正的冷启动简报。无需信用卡。'
            : 'Paste your product URL. Get a free product, audience, and competitor analysis plus a correctable Launch Brief—no credit card required.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-10">
          <div className={`flex flex-col gap-2 rounded-2xl border bg-white/[0.045] p-2.5 shadow-2xl transition-colors sm:flex-row ${error ? 'border-red-500/60' : 'border-white/10 focus-within:border-white/30'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
              <svg className="h-5 w-5 shrink-0 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 13.5a4.5 4.5 0 0 0 6.364 0l2.121-2.121a4.5 4.5 0 0 0-6.364-6.364L11.4 6.236m2.1 4.264a4.5 4.5 0 0 0-6.364 0l-2.121 2.121a4.5 4.5 0 0 0 6.364 6.364l1.22-1.22" /></svg>
              <input
                type="text"
                inputMode="url"
                autoFocus
                value={url}
                onChange={(event) => { setUrl(event.target.value); if (error) setError(''); }}
                placeholder="https://yourproduct.com"
                aria-label="Product URL"
                className="h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-700"
              />
            </div>
            <button
              type="submit"
              disabled={starting || !url.trim() || gtm.accessStatus === 'checking'}
              className="h-12 shrink-0 rounded-xl bg-white px-6 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              {starting ? (isZh ? '正在读懂你的产品…' : 'Analyzing…') : (isZh ? '免费分析产品 →' : 'Analyze Free →')}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </form>

        <div className="mt-8 border-t border-white/[0.07] pt-6">
          <p className="max-w-lg text-xs leading-5 text-zinc-600">
            {isZh
              ? '免费阶段会生成冷启动简报。订阅后，再为你制定完整推广蓝图、组建渠道团队，并生成 30 天行动计划。'
              : 'The free stage only builds your Launch Brief. The Blueprint, Channel Agents, and 30-day tasks generate after payment.'}
          </p>
        </div>
      </div>
    </div>
  );
}

import { callProductResearch } from '@/lib/gtm/api-client';
import { deriveProductFitProfile } from '@/lib/directories/matching';
import {
  buildLaunchBrief,
  createBriefResearchSteps,
  createMatchedDirectoryPipeline,
  storePatchForNewLaunch,
} from '@/lib/gtm/launch';
import type { LaunchState, MessageCard } from '@/lib/gtm/types';
import type { ProductResearchResult } from '@/lib/agents/researcher';

/** Typical wall-clock time for the free product research API call. */
export const FREE_LAUNCH_RESEARCH_ESTIMATE_MS = 60_000;

type GtmWriter = {
  update: (patch: Partial<{ launch: LaunchState } & Record<string, unknown>>) => void;
  setProfiles: (userDoc: string, projectDoc: string) => void;
  addDirectorMessage: (message: {
    role: 'user' | 'assistant';
    content: string;
    card?: MessageCard;
    contextRef?: LaunchState['project'] extends never ? never : {
      view: string;
      entityType: string;
      entityId: string;
    };
  }) => void;
  addAgentNotification: (notification: {
    title: string;
    summary: string;
    priority: 'important' | 'normal';
  }) => void;
  store: { userProfileDoc: string };
};

const inflightByLaunchId = new Map<string, Promise<LaunchState>>();

function setSteps(
  launch: LaunchState,
  updates: Record<
    string,
    { status: LaunchState['researchProgress'][number]['status']; detail?: string }
  >
): LaunchState {
  return {
    ...launch,
    researchProgress: launch.researchProgress.map((step) =>
      updates[step.id] ? { ...step, ...updates[step.id] } : step
    ),
    project: { ...launch.project, updatedAt: Date.now() },
  };
}

function isLikelyNetworkFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : '';
  return /fetch failed|timeout|timed out|network|econn|enotfound|und_err|abort|socket/i.test(
    `${message} ${cause}`
  );
}

export function isFreeLaunchResearchInFlight(launchId: string): boolean {
  return inflightByLaunchId.has(launchId);
}

export function isFreeLaunchResearchFailed(launch: LaunchState | undefined): boolean {
  if (!launch || launch.brief) return false;
  if (launch.project.phase !== 'researching') return false;
  return (
    launch.project.status === 'paused' ||
    launch.researchProgress.some((step) => step.status === 'error')
  );
}

export function needsFreeLaunchResearchResume(launch: LaunchState | undefined): boolean {
  if (!launch || launch.brief) return false;
  if (launch.project.phase !== 'researching') return false;
  if (isFreeLaunchResearchFailed(launch)) return false;
  return true;
}

/** Reset progress and clear a failed attempt so research can run again. */
export function resetFreeLaunchResearch(
  launch: LaunchState,
  isZh: boolean
): LaunchState {
  return {
    ...launch,
    brief: undefined,
    researchProgress: createBriefResearchSteps(isZh),
    researchConfidence: 'medium',
    researchSources: [],
    project: {
      ...launch.project,
      phase: 'researching',
      status: 'building',
      updatedAt: Date.now(),
    },
  };
}

export async function runFreeLaunchResearch(input: {
  launch: LaunchState;
  locale: string;
  isZh: boolean;
  gtm: GtmWriter;
}): Promise<LaunchState> {
  const launchId = input.launch.project.id;
  const existing = inflightByLaunchId.get(launchId);
  if (existing) return existing;

  const promise = executeFreeLaunchResearch(input);
  inflightByLaunchId.set(launchId, promise);
  try {
    return await promise;
  } finally {
    inflightByLaunchId.delete(launchId);
  }
}

async function executeFreeLaunchResearch(input: {
  launch: LaunchState;
  locale: string;
  isZh: boolean;
  gtm: GtmWriter;
}): Promise<LaunchState> {
  const { locale, isZh, gtm } = input;
  const productUrl = input.launch.project.productUrl;

  const updateLaunch = (launch: LaunchState) => {
    gtm.update(storePatchForNewLaunch(launch));
  };

  let launch = setSteps(input.launch, {
    website: { status: 'running', detail: productUrl },
    product: { status: 'running' },
    competitors: { status: 'running' },
  });
  updateLaunch(launch);

  let research: ProductResearchResult;
  try {
    research = await callProductResearch({ websiteUrl: productUrl, locale });
  } catch (error) {
    const network = isLikelyNetworkFailure(error);
    const detail = network
      ? isZh
        ? '网络连接失败或超时，请检查网络后重试'
        : 'Network connection failed or timed out. Check your network and retry.'
      : isZh
        ? '产品分析失败，请稍后重试'
        : 'Product analysis failed. Please try again.';
    launch = {
      ...setSteps(launch, {
        website: { status: 'error', detail },
        product: { status: 'error', detail },
        competitors: { status: 'error', detail },
        audience: { status: 'error', detail },
        brief: { status: 'error', detail },
      }),
      researchConfidence: 'low',
      project: {
        ...launch.project,
        phase: 'researching',
        status: 'paused',
        updatedAt: Date.now(),
      },
    };
    updateLaunch(launch);
    gtm.addDirectorMessage({
      role: 'assistant',
      content: isZh
        ? network
          ? '产品分析失败：当前无法连上研究服务（网络超时或中断）。请点击「重试」再试一次，成功前不会生成项目文档。'
          : '产品分析失败。请点击「重试」再试一次，成功前不会生成项目文档。'
        : network
          ? 'Product analysis failed: could not reach the research service (network timeout). Tap Retry — we won’t mark the project document ready until it succeeds.'
          : 'Product analysis failed. Tap Retry — we won’t mark the project document ready until it succeeds.',
    });
    gtm.addAgentNotification({
      title: isZh ? '产品分析失败' : 'Product analysis failed',
      summary: detail,
      priority: 'important',
    });
    throw error;
  }

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
  updateLaunch(launch);

  const brief = buildLaunchBrief(launch, research, isZh);
  const productName =
    research.product?.name?.trim() && research.product.name !== 'Unknown product'
      ? research.product.name.trim().slice(0, 120)
      : launch.project.productName;
  const productFit = deriveProductFitProfile({
    category: research.product?.category,
    targetUsers: research.product?.targetUsers,
    summary: research.product?.summary ?? brief.product.summary,
    capabilities: research.product?.capabilities ?? brief.product.features,
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
    project: {
      ...launch.project,
      productName,
      phase: 'brief_ready',
      status: 'building',
      updatedAt: Date.now(),
    },
  };
  updateLaunch(launch);

  gtm.addDirectorMessage({
    role: 'assistant',
    content: isZh
      ? '产品研究已经完成，项目文档可在左侧「文档」打开查看。哪里不准，直接告诉我（最多免费修改 20 次）。\n\n要继续生成完整 30 天计划、渠道内容和执行任务，需要先**召集团队**——解锁后 Agent Team 才会接手后续工作。'
      : 'Product research is done. Open the project document from Documents on the left and tell me what to correct (up to 20 free edits).\n\nTo go further—full 30-day plan, channel content, and execution—you need to **assemble the team** first. Agent Team unlocks the rest.',
    card: {
      kind: 'paywall_cta',
      label: isZh
        ? '组建我的 30 天推广团队 →'
        : 'Assemble my 30-day Agent Team →',
    },
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nowbuild:open-paywall'));
  }

  return launch;
}

import { callProductResearch } from '@/lib/gtm/api-client';
import { deriveProductFitProfile } from '@/lib/directories/matching';
import {
  buildLaunchBrief,
  createMatchedDirectoryPipeline,
  storePatchForNewLaunch,
} from '@/lib/gtm/launch';
import type { LaunchState } from '@/lib/gtm/types';
import type { ProductResearchResult } from '@/lib/agents/researcher';

/** Typical wall-clock time for the free product research API call. */
export const FREE_LAUNCH_RESEARCH_ESTIMATE_MS = 60_000;

type GtmWriter = {
  update: (patch: Partial<{ launch: LaunchState } & Record<string, unknown>>) => void;
  setProfiles: (userDoc: string, projectDoc: string) => void;
  addDirectorMessage: (message: {
    role: 'user' | 'assistant';
    content: string;
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

export function isFreeLaunchResearchInFlight(launchId: string): boolean {
  return inflightByLaunchId.has(launchId);
}

export function needsFreeLaunchResearchResume(launch: LaunchState | undefined): boolean {
  if (!launch || launch.brief) return false;
  if (launch.project.phase !== 'researching') return false;
  return true;
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

  let research: ProductResearchResult | null = null;
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
  } catch {
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
  }
  updateLaunch(launch);

  const brief = buildLaunchBrief(launch, research, isZh);
  const productName =
    research?.product?.name?.trim() && research.product.name !== 'Unknown product'
      ? research.product.name.trim().slice(0, 120)
      : launch.project.productName;
  const productFit = deriveProductFitProfile({
    category: research?.product?.category,
    targetUsers: research?.product?.targetUsers,
    summary: research?.product?.summary ?? brief.product.summary,
    capabilities: research?.product?.capabilities ?? brief.product.features,
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

  return launch;
}

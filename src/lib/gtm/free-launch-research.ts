import {
  callMarketStrategyReport,
  callProductResearch,
} from '@/lib/gtm/api-client';
import {
  buildLaunchBrief,
  createBriefResearchSteps,
  storePatchForNewLaunch,
} from '@/lib/gtm/launch';
import type { GtmStore, LaunchState, MessageCard, TargetMarket } from '@/lib/gtm/types';
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
  }) => { id: string };
  patchDirectorMessage: (
    id: string,
    patch: { content?: string; card?: MessageCard }
  ) => void;
  addAgentNotification: (notification: {
    title: string;
    summary: string;
    priority: 'important' | 'normal';
  }) => void;
  store: GtmStore;
};

const inflightByLaunchId = new Map<string, Promise<LaunchState>>();
const inflightReportByLaunchId = new Map<string, Promise<LaunchState>>();

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

export function needsFreeMarketStrategyReport(
  launch: LaunchState | undefined
): boolean {
  if (!launch?.brief || launch.channelRecommendations) return false;
  const reportStep = launch.researchProgress.find((step) => step.id === 'report');
  return reportStep?.status !== 'error';
}

export async function runFreeMarketStrategyReport(input: {
  launch: LaunchState;
  locale: string;
  isZh: boolean;
  gtm: GtmWriter;
  projectProfileDoc?: string;
  targetMarkets?: TargetMarket[];
}): Promise<LaunchState> {
  const launchId = input.launch.project.id;
  const existing = inflightReportByLaunchId.get(launchId);
  if (existing) return existing;

  const promise = (async () => {
    const { launch: initial, locale, isZh, gtm } = input;
    const sourceMarkdown =
      input.projectProfileDoc?.trim() ||
      initial.brief?.sourceMarkdown?.trim() ||
      gtm.store.projectProfileDoc.trim();
    let launch = setSteps(initial, {
      report: {
        status: 'running',
        detail: isZh
          ? '正在合并市场策略、渠道推荐与 Directory 排期'
          : 'Combining strategy, channels, and directory timing',
      },
    });
    launch = {
      ...launch,
      project: {
        ...launch.project,
        phase: 'researching',
        status: 'building',
        updatedAt: Date.now(),
      },
    };
    gtm.update(storePatchForNewLaunch(launch));
    const progressMessage = gtm.addDirectorMessage({
      role: 'assistant',
      content: isZh
        ? '市场策略报告已经开始生成。正在读取项目文档，并依次完成产品启动判断、渠道组合、30 天排期和 Directory 提交计划。你可以留在当前页面查看状态。'
        : 'Your market strategy report is now generating. I am reading the project document, then completing the launch diagnosis, channel mix, 30-day schedule, and directory submission plan. You can stay here and follow the status.',
      card: {
        kind: 'agent-task',
        label: isZh
          ? '市场策略报告 · 正在生成'
          : 'Market Strategy Report · Generating',
        status: 'running',
      },
    });

    try {
      const { report } = await callMarketStrategyReport({
        store: {
          ...gtm.store,
          launch,
          targetMarkets: input.targetMarkets ?? gtm.store.targetMarkets ?? [],
        },
        launchId,
        projectName: launch.project.productName,
        projectProfileDoc: sourceMarkdown,
        locale,
      });
      const primaryChannels = report.recommendations.filter(
        (item) => item.priority === 'primary'
      );
      launch = {
        ...setSteps(launch, {
          report: {
            status: 'done',
            detail: isZh
              ? `已生成 ${primaryChannels.length} 个主攻渠道与完整 30 天排期`
              : `${primaryChannels.length} primary channels and the full 30-day plan are ready`,
          },
        }),
        channelRecommendations: report,
        // Recommendations belong to the free report, but execution channels
        // are chosen explicitly only after payment.
        selectedChannelIds: [],
        project: {
          ...launch.project,
          phase: 'strategy_report_ready',
          status: 'building',
          updatedAt: Date.now(),
        },
      };
      gtm.update(storePatchForNewLaunch(launch));
      gtm.patchDirectorMessage(progressMessage.id, {
        content: isZh
          ? '市场策略报告生成完成。产品判断、渠道组合、30 天排期和 Directory 计划已经汇总。'
          : 'The market strategy report is complete. The product diagnosis, channel mix, 30-day schedule, and directory plan are ready.',
        card: {
          kind: 'agent-task',
          label: isZh
            ? '市场策略报告 · 已完成'
            : 'Market Strategy Report · Complete',
          status: 'done',
        },
      });
      gtm.addDirectorMessage({
        role: 'assistant',
        content: isZh
          ? '你的免费《30 天市场策略报告》已经完成。点击内容卡片即可展开查看完整报告。'
          : 'Your free 30-Day Market Strategy Report is ready. Open the content card to view the complete report.',
        card: {
          kind: 'strategy',
          title: isZh
            ? '查看完整《30 天市场策略报告》'
            : 'Open the complete 30-Day Market Strategy Report',
          channelIds: primaryChannels.map((item) => item.channelId),
        },
      });
      gtm.addDirectorMessage({
        role: 'assistant',
        content: isZh
          ? '报告免费保留。要把这份策略变成每天可审核的内容、Todo、发布材料，以及解锁最适合你的 Directory 平台，请组建 Launch Agent Team。'
          : 'The report stays free. Assemble your Launch Agent Team to turn it into daily reviewable content, tasks, publishing assets, and unlock your best-fit directory platforms.',
        card: {
          kind: 'paywall_cta',
          label: isZh
            ? '付费构建我的 Launch Agent Team →'
            : 'Build My Launch Agent Team →',
        },
      });
      return launch;
    } catch (error) {
      launch = {
        ...setSteps(launch, {
          report: {
            status: 'error',
            detail: isZh
              ? '市场策略报告生成失败，请重试'
              : 'Market strategy report failed. Please retry.',
          },
        }),
        project: {
          ...launch.project,
          phase: 'brief_ready',
          status: 'paused',
          updatedAt: Date.now(),
        },
      };
      gtm.update(storePatchForNewLaunch(launch));
      gtm.patchDirectorMessage(progressMessage.id, {
        content: isZh
          ? '市场策略报告生成中断。项目文档已经保留，可以直接重试。'
          : 'Market strategy report generation stopped. Your project document is safe and can be retried directly.',
        card: {
          kind: 'agent-task',
          label: isZh
            ? '市场策略报告 · 生成失败'
            : 'Market Strategy Report · Failed',
          status: 'error',
        },
      });
      throw error;
    }
  })();

  inflightReportByLaunchId.set(launchId, promise);
  try {
    return await promise;
  } finally {
    inflightReportByLaunchId.delete(launchId);
  }
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
  targetMarkets?: TargetMarket[];
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
  targetMarkets?: TargetMarket[];
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
  const targetMarketProfile = input.targetMarkets?.length
    ? `\n\n${isZh ? '## 用户确认的目标市场' : '## User-confirmed target markets'}\n${input.targetMarkets
        .map((market) => `- ${market.name} | ${market.language} (${market.locale})${market.audience ? ` | ${market.audience}` : ''}`)
        .join('\n')}`
    : '';
  const researchProfile = `${research.productProfileMarkdown}\n\n${research.competitorAnalysisMarkdown}${targetMarketProfile}`;
  gtm.setProfiles(gtm.store.userProfileDoc, researchProfile);
  updateLaunch(launch);

  const brief = buildLaunchBrief(launch, research, isZh);
  const productName =
    research.product?.name?.trim() && research.product.name !== 'Unknown product'
      ? research.product.name.trim().slice(0, 120)
      : launch.project.productName;
  launch = {
    ...setSteps(launch, {
      audience: { status: 'done' },
      brief: { status: 'done' },
    }),
    brief,
    briefEditUsed: 0,
    project: {
      ...launch.project,
      productName,
      phase: 'researching',
      status: 'building',
      updatedAt: Date.now(),
    },
  };
  updateLaunch(launch);
  return runFreeMarketStrategyReport({
    launch,
    locale,
    isZh,
    gtm,
    projectProfileDoc: researchProfile,
    targetMarkets: input.targetMarkets,
  });
}

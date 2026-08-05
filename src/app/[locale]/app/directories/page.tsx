'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import type {
  DirectorySubmission,
  DirectorySubmissionJob,
  DirectorySubmissionStatus,
  LaunchState,
} from '@/lib/gtm/types';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import {
  collectSiteAssetsWithExtension,
  detectPublisherExtension,
  focusExtensionTask,
  getExtensionTaskStates,
  listenToExtensionTask,
  resumeExtensionTask,
  submitDirectoryWithExtension,
  type ExtensionTaskEvent,
  type PublisherAvailability,
} from '@/lib/gtm/publisher-extension';
import {
  collectSiteAssetsFromServer,
  mergeWebsiteAssets,
  mergeWebsiteSocialLinks,
} from '@/lib/gtm/site-assets';
import { createDirectoryMaterialsCard } from '@/lib/directories/material-card';
import { callDirectoryMaterialGeneration } from '@/lib/gtm/api-client';
import {
  CONFIGURED_DIRECTORY_COUNT,
  directoryAdapterId,
} from '@/lib/directories/automation';
import { launchDirectories } from '@/lib/directories/data';
import { deriveProductFitProfile } from '@/lib/directories/matching';
import { createMatchedDirectoryPipeline } from '@/lib/gtm/launch';
import {
  aiGeneratableKeys,
  buildDirectoryLaunchKit,
  getDirectoryMaterialRequirements,
  mergeGeneratedDirectoryMaterials,
  preflightDirectory,
} from '@/lib/directories/materials';
import DirectoryExplorer from '@/components/directories/DirectoryExplorer';

type DirectoryFilter =
  | 'all'
  | 'recommended'
  | 'verify'
  | 'needs_action'
  | 'submitted'
  | 'published';

const EMPTY_DIRECTORIES: DirectorySubmission[] = [];
const EMPTY_DIRECTORY_JOBS: DirectorySubmissionJob[] = [];

const filterLabels: Record<DirectoryFilter, [string, string]> = {
  all: ['全部', 'All'],
  recommended: ['推荐', 'Recommended'],
  verify: ['待核实', 'Verify'],
  needs_action: ['需处理', 'Needs action'],
  submitted: ['已提交', 'Submitted'],
  published: ['已上线', 'Published'],
};

const statusLabels: Record<DirectorySubmissionStatus, [string, string]> = {
  discovered: ['待检查', 'Discovered'],
  matched: ['已匹配', 'Matched'],
  prepared: ['已准备', 'Prepared'],
  needs_action: ['需处理', 'Needs action'],
  submitted: ['已提交', 'Submitted'],
  under_review: ['审核中', 'Under review'],
  published: ['已上线', 'Published'],
  rejected: ['被拒绝', 'Rejected'],
  unavailable: ['不可用', 'Unavailable'],
};

const statusTone: Record<DirectorySubmissionStatus, string> = {
  discovered: 'text-zinc-500 bg-zinc-500/10',
  matched: 'text-sky-300 bg-sky-400/10',
  prepared: 'text-brand-300 bg-brand-400/10',
  needs_action: 'text-amber-200 bg-amber-300/10',
  submitted: 'text-blue-300 bg-blue-400/10',
  under_review: 'text-orange-300 bg-orange-400/10',
  published: 'text-emerald-300 bg-emerald-400/10',
  rejected: 'text-red-300 bg-red-400/10',
  unavailable: 'text-zinc-600 bg-zinc-600/10',
};

function jobIsTerminal(job: DirectorySubmissionJob): boolean {
  return ['submitted', 'under_review', 'published', 'skipped'].includes(
    job.status
  );
}

function blockerLabel(blocker: string | undefined, isZh: boolean): string {
  const labels: Record<string, [string, string]> = {
    login: ['需要登录', 'Login required'],
    captcha: ['需要验证码', 'Verification required'],
    anti_bot: ['需要人机验证', 'Human verification required'],
    payment_required: ['涉及付费', 'Payment required'],
    site_requirement: ['需要修改官网', 'Website action required'],
    profile_setup: ['需要完善资料', 'Profile setup required'],
    profile_verification: ['需要账号验证', 'Account verification required'],
    manual_fields: ['需要补充字段', 'Fields need attention'],
    submission_unconfirmed: ['提交结果待确认', 'Submission needs confirmation'],
    unsupported_directory: ['需要人工提交', 'Manual submission required'],
    extension_required: ['需要发布插件', 'Publisher extension required'],
    extension_error: ['插件执行失败', 'Extension error'],
    google_oauth_loop: ['Google 登录循环', 'Google login loop'],
    google_reauthentication: ['需要验证 Google 密码', 'Google password required'],
    google_2fa: ['需要 Google 二次验证', 'Google 2FA required'],
  };
  const label = blocker ? labels[blocker] : undefined;
  return label?.[isZh ? 0 : 1] ?? (isZh ? '需要处理' : 'Action required');
}

export default function DirectoryWorkspacePage() {
  const gtm = useGtm();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const updateStore = gtm.update;
  const { setViewContext, clearViewContext } = useViewContext();
  const [filter, setFilter] = useState<DirectoryFilter>(
    gtm.store.paid ? 'recommended' : 'all'
  );
  const [availability, setAvailability] =
    useState<PublisherAvailability | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [preparing, setPreparing] = useState(false);
  const [directoryMessage, setDirectoryMessage] = useState('');
  const launch = gtm.store.launch;
  // Stable empty fallbacks — `?? []` would allocate every render and retrigger
  // the view-context effect (clear → set → re-render → infinite loop).
  const directories = launch?.directories ?? EMPTY_DIRECTORIES;
  const hasPersonalizedDirectoryMatches = directories.some(
    (item) => Boolean(item.fitTier)
  );
  const jobs = launch?.directoryJobs ?? EMPTY_DIRECTORY_JOBS;
  const launchId = launch?.project.id;
  const launchRef = useRef(launch);
  const directoryViewRevision = useMemo(
    () =>
      launchId
        ? [
            launchId,
            ...directories.map(
              (item) => `${item.id}:${item.status}:${item.lastVerified}`
            ),
            ...jobs.map((job) => `${job.id}:${job.status}:${job.updatedAt}`),
          ].join('|')
        : null,
    [directories, jobs, launchId]
  );
  const activeJobRef = useRef<string | null>(null);
  const initializedSelectionRef = useRef(false);
  const listenerDisposersRef = useRef(new Map<string, () => void>());
  launchRef.current = launch;

  const persistLaunch = useCallback(
    (mutate: (current: LaunchState) => LaunchState) => {
      const current = launchRef.current;
      if (!current) return;
      const next = mutate(current);
      launchRef.current = next;
      updateStore({ launch: next });
    },
    [updateStore]
  );

  // Personalized matching is created only after server-owned paid access is
  // confirmed. Free users keep the neutral public catalog in Launch state.
  useEffect(() => {
    const current = launchRef.current;
    if (!gtm.store.paid || !current?.brief) return;
    if (hasPersonalizedDirectoryMatches) return;
    const brief = current.brief;
    const profile = deriveProductFitProfile({
      category: brief.product.summary,
      targetUsers: [brief.audience.primary],
      summary: `${brief.product.summary}\n${brief.positioning.statement}`,
      capabilities: [
        ...brief.product.features,
        brief.sourceMarkdown ?? '',
      ],
      stage: brief.product.stage,
    });
    persistLaunch((latest) => ({
      ...latest,
      directories: createMatchedDirectoryPipeline(profile, isZh),
      project: { ...latest.project, updatedAt: Date.now() },
    }));
    setFilter('recommended');
  }, [
    gtm.store.paid,
    hasPersonalizedDirectoryMatches,
    isZh,
    persistLaunch,
  ]);

  const patchJob = useCallback(
    (
      jobId: string,
      patch: Partial<DirectorySubmissionJob>,
      directoryPatch?: Partial<DirectorySubmission>
    ) => {
      persistLaunch((current) => {
        const job = current.directoryJobs?.find((item) => item.id === jobId);
        const directoryId = job?.directoryId;
        const now = Date.now();
        return {
          ...current,
          directoryJobs: (current.directoryJobs ?? []).map((item) =>
            item.id === jobId ? { ...item, ...patch, updatedAt: now } : item
          ),
          directories: directoryPatch
            ? current.directories.map((item) =>
                item.id === directoryId
                  ? { ...item, ...directoryPatch }
                  : item
              )
            : current.directories,
          project: { ...current.project, updatedAt: now },
        };
      });
    },
    [persistLaunch]
  );

  const finishActiveJob = useCallback((jobId: string, requestId?: string) => {
    if (activeJobRef.current === jobId) activeJobRef.current = null;
    if (!requestId) return;
    const dispose = listenerDisposersRef.current.get(requestId);
    if (dispose) dispose();
    listenerDisposersRef.current.delete(requestId);
  }, []);

  const handleExtensionEvent = useCallback(
    (
      jobId: string,
      requestId: string,
      event: ExtensionTaskEvent
    ) => {
      const detail = event.directoryResult;
      const proof = event.message || event.error;
      if (event.status === 'published') {
        patchJob(
          jobId,
          {
            status: 'submitted',
            blocker: undefined,
            blockerDetail: undefined,
            proof: event.postUrl || proof,
          },
          {
            status: 'submitted',
            proof: event.postUrl || proof,
          }
        );
        finishActiveJob(jobId, requestId);
        setDirectoryMessage(
          proof ||
            (isZh
              ? '目录已提交并收到平台回执。'
              : 'The directory received the submission.')
        );
        return;
      }
      if (
        event.status === 'needs_user_action' ||
        event.status === 'waiting_login'
      ) {
        patchJob(
          jobId,
          {
            status: 'needs_action',
            blocker: detail?.blocker || event.blocker || 'user_action',
            blockerDetail: detail?.blockerDetail || proof,
            missingRequired: detail?.missingRequired,
            proof,
          },
          { status: 'needs_action', proof }
        );
        activeJobRef.current = null;
        setDirectoryMessage(
          proof ||
            (isZh
              ? '有目录需要你完成登录或验证。'
              : 'A directory needs login or verification.')
        );
        return;
      }
      if (['prepared', 'awaiting_user', 'recorded'].includes(event.status)) {
        patchJob(
          jobId,
          {
            status: 'prepared',
            blocker: detail?.blocker,
            blockerDetail: detail?.blockerDetail,
            missingRequired: detail?.missingRequired,
            proof,
          },
          { status: 'prepared', proof }
        );
        finishActiveJob(jobId, requestId);
        return;
      }
      if (event.status === 'failed' || event.status === 'blocked') {
        patchJob(
          jobId,
          {
            status: event.status === 'blocked' ? 'needs_action' : 'failed',
            blocker: detail?.blocker || event.blocker || event.status,
            blockerDetail: detail?.blockerDetail || proof,
            missingRequired: detail?.missingRequired,
            proof,
          },
          {
            status:
              event.status === 'blocked' ? 'needs_action' : 'unavailable',
            proof,
          }
        );
        finishActiveJob(jobId, requestId);
        return;
      }
      if (['opening', 'filling', 'navigating'].includes(event.status)) {
        patchJob(jobId, {
          status: event.status === 'opening' ? 'opening' : 'filling',
          proof,
        });
      }
    },
    [finishActiveJob, isZh, patchJob]
  );

  const attachTaskListener = useCallback(
    (jobId: string, requestId: string) => {
      if (listenerDisposersRef.current.has(requestId)) return;
      const dispose = listenToExtensionTask(requestId, (event) =>
        handleExtensionEvent(jobId, requestId, event)
      );
      listenerDisposersRef.current.set(requestId, dispose);
    },
    [handleExtensionEvent]
  );

  const startQueuedJob = useCallback(
    async (job: DirectorySubmissionJob) => {
      const current = launchRef.current;
      if (!current || !job.adapterId || activeJobRef.current) return;
      activeJobRef.current = job.id;
      patchJob(job.id, { status: 'opening', attempt: job.attempt + 1 });
      try {
        const task = await submitDirectoryWithExtension(
          job.adapterId,
          buildDirectoryLaunchKit(current)
        );
        attachTaskListener(job.id, task.requestId);
        patchJob(job.id, {
          requestId: task.requestId,
          status: 'opening',
          blocker: undefined,
          blockerDetail: undefined,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : isZh
              ? '目录任务启动失败'
              : 'Directory task failed to start';
        patchJob(
          job.id,
          { status: 'failed', blocker: 'extension_error', blockerDetail: message },
          { status: 'unavailable', proof: message }
        );
        activeJobRef.current = null;
        setDirectoryMessage(message);
      }
    },
    [attachTaskListener, isZh, patchJob]
  );

  useEffect(() => {
    let cancelled = false;
    void detectPublisherExtension().then(async (extension) => {
      if (cancelled) return;
      setAvailability(extension);
      if (!extension.installed) return;
      try {
        const tasks = await getExtensionTaskStates();
        const currentJobs = launchRef.current?.directoryJobs ?? [];
        const activeRequestIds = new Set(tasks.map((task) => task.requestId));
        for (const task of tasks) {
          if (task.kind !== 'directory') continue;
          const job = currentJobs.find(
            (item) =>
              item.requestId === task.requestId ||
              (item.directoryId === task.directoryId &&
                ['opening', 'filling', 'needs_action'].includes(item.status))
          );
          if (!job) continue;
          patchJob(job.id, {
            requestId: task.requestId,
            status:
              task.lastStatus === 'needs_user_action'
                ? 'needs_action'
                : task.lastStatus === 'opening'
                  ? 'opening'
                  : 'filling',
          });
          attachTaskListener(job.id, task.requestId);
          if (task.lastStatus !== 'needs_user_action') {
            activeJobRef.current = job.id;
          }
        }
        for (const job of currentJobs) {
          if (
            job.requestId &&
            ['opening', 'filling'].includes(job.status) &&
            !activeRequestIds.has(job.requestId)
          ) {
            patchJob(job.id, {
              status: 'failed',
              blocker: 'extension_task_missing',
              blockerDetail: isZh
                ? '浏览器中的任务已结束或丢失，请重新检查后再试。'
                : 'The browser task ended or was lost. Run the check again.',
            });
          }
        }
      } catch {
        // Queue state remains durable in NowBuild even if the extension cannot
        // report its local tasks during this render.
      }
    });
    return () => {
      cancelled = true;
      for (const dispose of listenerDisposersRef.current.values()) dispose();
      listenerDisposersRef.current.clear();
    };
  }, [attachTaskListener, isZh, patchJob]);

  useEffect(() => {
    if (
      initializedSelectionRef.current ||
      !hasPersonalizedDirectoryMatches
    ) {
      return;
    }
    initializedSelectionRef.current = true;
    setSelectedIds(
      new Set(
        directories
          .filter((item) => item.fitTier === 'recommended')
          .slice(0, 10)
          .map((item) => item.id)
      )
    );
  }, [directories, hasPersonalizedDirectoryMatches]);

  const nextQueuedJob = jobs.find((job) => job.status === 'queued');
  useEffect(() => {
    if (
      !availability?.installed ||
      !nextQueuedJob ||
      activeJobRef.current
    ) {
      return;
    }
    void startQueuedJob(nextQueuedJob);
  }, [
    availability?.installed,
    nextQueuedJob?.id,
    nextQueuedJob?.status,
    startQueuedJob,
  ]);

  useEffect(() => {
    if (!launchId || directoryViewRevision === null) return;
    setViewContext({
      view: 'directory_pipeline',
      entityType: 'directory_pipeline',
      entityId: launchId,
      channelId: 'directory',
      title: 'Directory Agent · Submission Pipeline',
      revision: directoryViewRevision,
    });
  }, [directoryViewRevision, launchId, setViewContext]);

  useEffect(() => () => clearViewContext(), [clearViewContext]);

  const supportedDirectoryIds = useMemo(
    () =>
      new Set(
        availability?.installed
          ? availability.supportedDirectories.map((item) => item.id)
          : []
      ),
    [availability]
  );
  const supportedDirectoryById = useMemo(
    () =>
      new Map(
        (availability?.supportedDirectories ?? []).map((item) => [item.id, item])
      ),
    [availability]
  );

  const shown = useMemo(
    () =>
      filter === 'all'
        ? directories
        : filter === 'recommended' || filter === 'verify'
          ? directories.filter((item) => item.fitTier === filter)
          : directories.filter((item) => item.status === filter),
    [directories, filter]
  );

  const jobByDirectory = useMemo(
    () =>
      new Map(
        jobs
          .slice()
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((job) => [job.directoryId, job])
      ),
    [jobs]
  );

  const prepareSelectedDirectories = async () => {
    const current = launchRef.current;
    if (!current || !selectedIds.size) {
      setDirectoryMessage(
        isZh ? '请先选择至少一个目录。' : 'Select at least one directory.'
      );
      return;
    }
    const selected = current.directories.filter((item) =>
      selectedIds.has(item.id)
    );
    setPreparing(true);
    setDirectoryMessage(
      isZh
        ? '正在检查目录要求并准备资料…'
        : 'Checking requirements and preparing materials…'
    );
    let kit = buildDirectoryLaunchKit(current);
    let aiUnavailable = false;

    if (!kit.assets.some((asset) => asset.kind === 'logo') && kit.productUrl) {
      try {
        const collected = await collectSiteAssetsFromServer(kit.productUrl);
        kit = {
          ...mergeWebsiteSocialLinks(kit, collected.socialLinks),
          assets: mergeWebsiteAssets(kit.assets, collected.assets),
        };
      } catch {
        // The browser extension below remains the fallback for blocked sites.
      }
      if (
        availability?.installed &&
        !kit.assets.some((asset) => asset.kind === 'logo')
      ) {
        try {
          const collected = await collectSiteAssetsWithExtension(kit.productUrl);
          kit = {
            ...kit,
            assets: mergeWebsiteAssets(kit.assets, collected.assets),
          };
        } catch {
          // Missing public assets become one consolidated user request below.
        }
      }
    }

    const requirementsByDirectory = new Map(
      selected.map((item) => {
        const adapterId = directoryAdapterId(item.url);
        const requirements = adapterId
          ? supportedDirectoryById.get(adapterId)?.requirements
          : undefined;
        return [
          item.id,
          requirements ?? getDirectoryMaterialRequirements(item, isZh),
        ] as const;
      })
    );
    const initialChecks = selected.map((item) => {
      const requirements = requirementsByDirectory.get(item.id) ?? [];
      return preflightDirectory(item, kit, isZh, {
        requirements: requirements.map((requirement) => ({
          ...requirement,
          required: true,
        })),
      });
    });
    const requestedFields = aiGeneratableKeys(initialChecks);
    if (requestedFields.length) {
      try {
        const generated = await callDirectoryMaterialGeneration({
          store: { ...gtm.store, launch: current },
          requestedFields,
          locale,
        });
        kit = mergeGeneratedDirectoryMaterials(kit, generated);
      } catch {
        aiUnavailable = true;
      }
    }

    const now = Date.now();
    const existingJobs = current.directoryJobs ?? [];
    const newJobs: DirectorySubmissionJob[] = selected.map((item) => {
      const adapterId = directoryAdapterId(item.url) ?? undefined;
      const supportedProfile = adapterId
        ? supportedDirectoryById.get(adapterId)
        : undefined;
      const preflight = preflightDirectory(item, kit, isZh, {
        aiUnavailable,
        requirements:
          supportedProfile?.requirements ?? requirementsByDirectory.get(item.id),
      });
      const completed = existingJobs.find(
        (job) => job.directoryId === item.id && jobIsTerminal(job)
      );
      if (completed) {
        return { ...completed, preflight, updatedAt: now };
      }
      const extensionSupports =
        Boolean(adapterId) && supportedDirectoryIds.has(adapterId as string);
      const submissionPolicy =
        supportedProfile?.submissionPolicy ?? 'prepare_only';
      const previous = existingJobs.find(
        (job) => job.directoryId === item.id && !jobIsTerminal(job)
      );
      const status: DirectorySubmissionJob['status'] = !preflight.ready
        ? 'needs_materials'
        : extensionSupports
          ? 'queued'
          : 'manual';
      return {
        id: previous?.id ?? crypto.randomUUID(),
        directoryId: item.id,
        directoryName: item.name,
        adapterId,
        submissionPolicy,
        allowFinalSubmit: false,
        idempotencyKey: `${current.project.id}:${item.id}:${kit.productUrl}`,
        status,
        preflight,
        blocker:
          status === 'manual'
            ? availability?.installed
              ? 'unsupported_directory'
              : 'extension_required'
            : undefined,
        blockerDetail:
          status === 'manual'
            ? availability?.installed
              ? isZh
                ? '当前插件未声明支持该目录，需要人工提交。'
                : 'The installed extension does not support this directory.'
              : isZh
                ? '安装发布插件后可自动处理支持的目录。'
                : 'Install the publisher extension for supported directories.'
            : undefined,
        attempt: previous?.attempt ?? 0,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
    });
    const replacedIds = new Set(newJobs.map((job) => job.directoryId));
    const nextJobs = [
      ...existingJobs.filter((job) => !replacedIds.has(job.directoryId)),
      ...newJobs,
    ];
    const statusByDirectory = new Map(
      newJobs.map((job) => [
        job.directoryId,
        job.status === 'submitted'
          ? ('submitted' as const)
          : job.status === 'under_review'
            ? ('under_review' as const)
            : job.status === 'published'
              ? ('published' as const)
              : job.status === 'prepared'
                ? ('prepared' as const)
                : job.status === 'needs_materials' || job.status === 'manual'
                  ? ('needs_action' as const)
                  : ('matched' as const),
      ])
    );
    persistLaunch((latest) => ({
      ...latest,
      directoryLaunchKit: kit,
      directoryJobs: nextJobs,
      directories: latest.directories.map((item) => {
        const nextStatus = statusByDirectory.get(item.id);
        return nextStatus ? { ...item, status: nextStatus } : item;
      }),
      project: { ...latest.project, updatedAt: now },
    }));
    const readyCount = newJobs.filter((job) => job.status === 'queued').length;
    const needsCount = newJobs.filter(
      (job) => job.status === 'needs_materials'
    ).length;
    setDirectoryMessage(
      isZh
        ? `检查完成：${readyCount} 个进入后台队列，${needsCount} 个需要补充资料。`
        : `Check complete: ${readyCount} queued, ${needsCount} need more information.`
    );
    const supplementalChecks = selected.flatMap((item) =>
      preflightDirectory(item, kit, isZh, {
        aiUnavailable: true,
        requirements: (
          requirementsByDirectory.get(item.id) ?? []
        ).map((requirement) => ({
          ...requirement,
          required: true,
        })),
      }).checks.filter((check) => check.status !== 'ready')
    );
    if (needsCount > 0 || supplementalChecks.length > 0) {
      const missingChecks = newJobs.flatMap((job) =>
        job.preflight.checks.filter((check) => check.status !== 'ready')
      );
      const missingKeys = [
        ...new Set(
          [...missingChecks, ...supplementalChecks].map((check) => check.key)
        ),
      ];
      const requiredKeys = [
        ...new Set(
          missingChecks
            .filter((check) => check.status === 'needs_user')
            .map((check) => check.key)
        ),
      ];
      const openCard = gtm.store.directorChat.find(
        (message) =>
          message.card?.kind === 'directory_materials' &&
          !message.card.card.savedAt
      );
      const materialCard = createDirectoryMaterialsCard(
        kit,
        isZh,
        missingKeys,
        requiredKeys
      );
      if (openCard) {
        gtm.patchDirectorMessage(openCard.id, {
          card: { kind: 'directory_materials', card: materialCard },
        });
      } else {
        gtm.addDirectorMessage({
          role: 'assistant',
          content: isZh
            ? needsCount > 0
              ? `这批 Directory 还有 ${needsCount} 个平台缺少必需资料。我也合并了这些平台可复用的补充字段，填写后会直接保存到资料库。`
              : '提交前还有一些可复用资料值得补全。它们不会阻塞队列，但能提高后续平台的自动填写率。'
            : needsCount > 0
              ? `${needsCount} directories still need required details. I also merged reusable optional fields into this card.`
              : 'A few reusable details are still worth adding. They will not block the queue, but they improve autofill coverage.',
          card: {
            kind: 'directory_materials',
            card: materialCard,
          },
        });
      }
    }
    setPreparing(false);
  };

  const continueJob = async (job: DirectorySubmissionJob) => {
    if (!job.requestId) return;
    if (activeJobRef.current && activeJobRef.current !== job.id) {
      setDirectoryMessage(
        isZh
          ? '另一个目录正在处理中，完成后会继续这个任务。'
          : 'Another directory is being processed. Resume this task afterward.'
      );
      return;
    }
    activeJobRef.current = job.id;
    patchJob(job.id, {
      status: 'filling',
      blocker: undefined,
      blockerDetail: undefined,
    });
    attachTaskListener(job.id, job.requestId);
    try {
      await resumeExtensionTask(job.requestId);
    } catch (error) {
      activeJobRef.current = null;
      patchJob(job.id, {
        status: 'failed',
        blocker: 'resume_failed',
        blockerDetail:
          error instanceof Error ? error.message : 'Resume failed',
      });
    }
  };

  const retryJob = (job: DirectorySubmissionJob) => {
    if (!availability?.installed) {
      setDirectoryMessage(
        isZh
          ? '请先安装并启用发布插件，再重试。'
          : 'Install and enable the publisher extension before retrying.'
      );
      return;
    }
    if (!job.adapterId || !supportedDirectoryIds.has(job.adapterId)) {
      setDirectoryMessage(
        isZh
          ? '当前插件不支持该目录，无法自动重试。'
          : 'The installed extension does not support this directory.'
      );
      return;
    }
    patchJob(
      job.id,
      {
        status: 'queued',
        blocker: undefined,
        blockerDetail: undefined,
        requestId: undefined,
        proof: undefined,
        missingRequired: undefined,
      },
      { status: 'matched', proof: undefined }
    );
    setDirectoryMessage(
      isZh
        ? `已重新排队：${job.directoryName}`
        : `Re-queued: ${job.directoryName}`
    );
  };

  const updateDirectory = (
    id: string,
    patch: Partial<DirectorySubmission>
  ) => {
    persistLaunch((current) => ({
      ...current,
      directories: current.directories.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
      project: { ...current.project, updatedAt: Date.now() },
    }));
  };

  const markSubmitted = (job: DirectorySubmissionJob) => {
    patchJob(
      job.id,
      { status: 'submitted', blocker: undefined, blockerDetail: undefined },
      { status: 'submitted' }
    );
  };

  const stats = {
    checked: jobs.length,
    queued: jobs.filter((job) =>
      ['queued', 'opening', 'filling'].includes(job.status)
    ).length,
    materials: jobs.filter((job) => job.status === 'needs_materials').length,
    action: jobs.filter(
      (job) => job.status === 'needs_action' || job.status === 'manual'
    ).length,
    submitted: directories.filter((item) =>
      ['submitted', 'under_review', 'published'].includes(item.status)
    ).length,
    published: directories.filter((item) => item.status === 'published').length,
  };

  const actionJobs = jobs.filter((job) =>
    ['needs_materials', 'needs_action', 'manual', 'failed'].includes(job.status)
  );

  if (!launch) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/app" className="text-sm text-zinc-400">
          {isZh ? '先建立冷启动 →' : 'Build your launch first →'}
        </Link>
      </div>
    );
  }

  // Don't flash the free catalog while subscription access is still unknown.
  // `store.paid` stays false until /api/gtm/access resolves.
  if (
    gtm.accessStatus === 'checking' ||
    gtm.accessStatus === 'error' ||
    (!gtm.hydrated && gtm.accessStatus !== 'unpaid')
  ) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-300" />
        <p className="text-sm text-zinc-500">
          {gtm.accessStatus === 'error'
            ? isZh
              ? '正在重试订阅状态…'
              : 'Retrying subscription status…'
            : isZh
              ? '正在加载推荐目录…'
              : 'Loading recommended directories…'}
        </p>
      </div>
    );
  }

  if (gtm.accessStatus === 'unpaid' || !gtm.store.paid) {
    return (
      <div className="h-full overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-7xl pb-16">
          <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.08] pb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                {isZh ? 'Directory · 初始化状态' : 'Directory · Initial state'}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                {isZh ? '通用 Directory 列表' : 'General directory catalog'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                {isZh
                  ? `免费阶段可以浏览全部 ${launchDirectories.length} 个公开候选平台，但不会显示针对你的匹配分、推荐理由或提交顺序。组建 Agent Team 后才会解锁最适合这个产品的平台。`
                  : `Browse all ${launchDirectories.length} public candidates for free. Product-specific fit scores, rationale, and submission order appear only after you assemble Agent Team.`}
              </p>
            </div>
            <button type="button" onClick={() => window.dispatchEvent(new Event('nowbuild:open-paywall'))} className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-zinc-200">
              {isZh ? '付费构建我的 Launch Agent Team →' : 'Build My Launch Agent Team →'}
            </button>
          </header>

          <DirectoryExplorer locale={locale} variant="embedded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
            Directory
          </h1>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            {isZh
              ? '完善提交资料，再从推荐目录中选择并提交'
              : 'Prepare materials, then pick and submit directories'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasPersonalizedDirectoryMatches && filter !== 'all' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white hover:text-black"
            >
              {isZh ? '返回完整列表' : 'View full list'}
            </button>
          )}
          <Link
            href="/app/launch-kit"
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white hover:text-black"
          >
            {isZh ? '查看提交资料' : 'Review submission materials'}
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto max-w-7xl pb-16">
      <section className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.035] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              {isZh ? '自动发布流程' : 'Automated workflow'}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {isZh
                ? `已选择 ${selectedIds.size} 个目录 · ${
                    availability?.installed
                      ? `当前插件支持 ${availability.supportedDirectories.length} 个`
                      : `等待检测插件（内置配置 ${CONFIGURED_DIRECTORY_COUNT} 个）`
                  }`
                : `${selectedIds.size} selected · ${
                    availability?.installed
                      ? `${availability.supportedDirectories.length} supported by the installed extension`
                      : `Extension not detected (${CONFIGURED_DIRECTORY_COUNT} configured)`
                  }`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void prepareSelectedDirectories()}
            disabled={preparing || selectedIds.size === 0}
            className="rounded-full bg-emerald-300 px-5 py-2.5 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {preparing
              ? isZh
                ? '正在检查并准备…'
                : 'Checking and preparing…'
              : isZh
                ? '自动检查并开始'
                : 'Check and start'}
          </button>
        </div>
        {directoryMessage && (
          <p className="mt-4 border-t border-white/[0.07] pt-4 text-xs text-zinc-400">
            {directoryMessage}
          </p>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
        {[
          [isZh ? '已检查' : 'Checked', stats.checked],
          [isZh ? '后台处理中' : 'In queue', stats.queued],
          [isZh ? '缺少资料' : 'Missing info', stats.materials],
          [isZh ? '需要操作' : 'Needs action', stats.action],
          [isZh ? '已提交' : 'Submitted', stats.submitted],
          [isZh ? '已上线' : 'Published', stats.published],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
          >
            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
              {label}
            </p>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </section>

      {actionJobs.length > 0 && (
        <section className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
            {isZh ? '需要你的操作' : 'Needs your action'}
          </p>
          <div className="mt-3 space-y-2">
            {actionJobs.map((job) => {
              const missing = job.preflight.checks.filter(
                (check) => check.status !== 'ready'
              );
              const directory = directories.find(
                (item) => item.id === job.directoryId
              );
              return (
                <div
                  key={job.id}
                  className="rounded-xl bg-black/10 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-white">
                      {job.directoryName}
                    </strong>
                    <span className="rounded-full bg-amber-200/10 px-2 py-0.5 text-[10px] text-amber-200">
                      {blockerLabel(job.blocker, isZh)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    {job.blockerDetail ||
                      job.proof ||
                      missing
                        .map(
                          (item) =>
                            `${item.label}${
                              item.detail
                                ? isZh
                                  ? `（${item.detail}）`
                                  : ` (${item.detail})`
                                : ''
                            }`
                        )
                        .join(' · ') ||
                      (isZh
                        ? '请打开平台页面完成当前步骤。'
                        : 'Open the platform page and complete the current step.')}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {job.status === 'needs_materials' && (
                      <Link
                        href="/app/launch-kit"
                        className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-black"
                      >
                        {isZh ? '补充资料' : 'Add information'}
                      </Link>
                    )}
                    {job.status === 'needs_action' && job.requestId && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void focusExtensionTask(job.requestId as string).catch(
                              (error) =>
                                setDirectoryMessage(
                                  error instanceof Error
                                    ? error.message
                                    : isZh
                                      ? '无法打开目录页面。'
                                      : 'Could not open the directory page.'
                                )
                            )
                          }
                          className="rounded-full bg-amber-200 px-3 py-1.5 text-[10px] font-bold text-black"
                        >
                          {isZh ? '前往处理' : 'Open task'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void continueJob(job)}
                          className="rounded-full border border-amber-200/30 px-3 py-1.5 text-[10px] text-amber-100"
                        >
                          {isZh ? '完成后继续' : 'Continue when done'}
                        </button>
                      </>
                    )}
                    {job.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => retryJob(job)}
                        title={isZh ? '重新提交' : 'Retry submission'}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-black hover:bg-zinc-200"
                      >
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          aria-hidden
                        >
                          <path d="M21 12a9 9 0 1 1-2.6-6.3" />
                          <path d="M21 3v6h-6" />
                        </svg>
                        {isZh ? '重试' : 'Retry'}
                      </button>
                    )}
                    {(job.status === 'manual' || job.status === 'failed') &&
                      directory && (
                        <a
                          href={directory.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-300"
                        >
                          {isZh ? '打开平台 ↗' : 'Open site ↗'}
                        </a>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-white/[0.04] p-1">
          {(Object.keys(filterLabels) as DirectoryFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-[10px] ${
                filter === item
                  ? 'bg-white text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {filterLabels[item][isZh ? 0 : 1]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const shownIds = shown.map((item) => item.id);
            const allSelected = shownIds.every((id) => selectedIds.has(id));
            setSelectedIds((current) => {
              const next = new Set(current);
              for (const id of shownIds) {
                if (allSelected) next.delete(id);
                else next.add(id);
              }
              return next;
            });
          }}
          className="text-xs text-zinc-500 hover:text-white"
        >
          {isZh ? '全选 / 取消当前列表' : 'Select / clear current list'}
        </button>
      </div>

      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        {shown.map((item) => {
          const adapterId = directoryAdapterId(item.url);
          const supported =
            Boolean(adapterId) && supportedDirectoryIds.has(adapterId as string);
          const job = jobByDirectory.get(item.id);
          const missing = job?.preflight.checks.filter(
            (check) => check.status !== 'ready'
          );
          return (
            <article
              key={item.id}
              className={`rounded-3xl border p-5 ${
                selectedIds.has(item.id)
                  ? 'border-emerald-300/25 bg-emerald-300/[0.025]'
                  : 'border-white/[0.07] bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={(event) =>
                    setSelectedIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })
                  }
                  aria-label={`${isZh ? '选择' : 'Select'} ${item.name}`}
                  className="mt-1 h-4 w-4 accent-emerald-300"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-white hover:underline"
                    >
                      {item.name} ↗
                    </a>
                    {typeof item.fitScore === 'number' && (
                      <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 font-mono text-[9px] text-emerald-300">
                        {item.fitScore}/100
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${statusTone[item.status]}`}
                    >
                      {statusLabels[item.status][isZh ? 0 : 1]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {item.matchReason}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded-xl bg-black/15 p-2.5">
                  <span className="block text-zinc-600">
                    {isZh ? '费用' : 'Pricing'}
                  </span>
                  <strong className="mt-1 block capitalize text-zinc-300">
                    {item.pricing}
                  </strong>
                </div>
                <div className="rounded-xl bg-black/15 p-2.5">
                  <span className="block text-zinc-600">
                    {isZh ? '处理方式' : 'Automation'}
                  </span>
                  <strong
                    className={`mt-1 block ${
                      supported ? 'text-emerald-300' : 'text-zinc-400'
                    }`}
                  >
                    {supported
                      ? isZh
                        ? '后台辅助'
                        : 'Background assisted'
                      : isZh
                        ? '人工提交'
                        : 'Manual'}
                  </strong>
                </div>
                <div className="rounded-xl bg-black/15 p-2.5">
                  <span className="block text-zinc-600">
                    {isZh ? '最后核验' : 'Verified'}
                  </span>
                  <strong className="mt-1 block text-zinc-300">
                    {item.lastVerified || (isZh ? '未核验' : 'Unverified')}
                  </strong>
                </div>
              </div>

              {job && (
                <div className="mt-3 rounded-xl border border-white/[0.06] p-3 text-[10px] text-zinc-500">
                  <span className="text-zinc-300">
                    {isZh ? '资料检查' : 'Material check'}：
                    {job.preflight.readyCount}/{job.preflight.checks.length}
                  </span>
                  {missing?.length
                    ? ` · ${missing.map((check) => check.label).join('、')}`
                    : ''}
                  <span className="ml-2 text-zinc-600">
                    · {job.status.replaceAll('_', ' ')}
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {job?.status === 'prepared' && (
                  <button
                    type="button"
                    onClick={() => markSubmitted(job)}
                    className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-black"
                  >
                    {isZh ? '我已确认提交' : 'I confirmed submission'}
                  </button>
                )}
                {job?.status === 'needs_action' && job.requestId && (
                  <button
                    type="button"
                    onClick={() => void continueJob(job)}
                    className="rounded-full bg-amber-200 px-3 py-1.5 text-[10px] font-bold text-black"
                  >
                    {isZh ? '处理后继续' : 'Continue after action'}
                  </button>
                )}
                {job?.status === 'failed' && (
                  <button
                    type="button"
                    onClick={() => retryJob(job)}
                    title={isZh ? '重新提交' : 'Retry submission'}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-black hover:bg-zinc-200"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      aria-hidden
                    >
                      <path d="M21 12a9 9 0 1 1-2.6-6.3" />
                      <path d="M21 3v6h-6" />
                    </svg>
                    {isZh ? '重试' : 'Retry'}
                  </button>
                )}
                <input
                  type="url"
                  placeholder={
                    isZh ? '粘贴提交证明或上线链接' : 'Paste proof or listing URL'
                  }
                  defaultValue={item.publishedUrl ?? ''}
                  onBlur={(event) =>
                    updateDirectory(item.id, {
                      publishedUrl: event.target.value.trim() || undefined,
                    })
                  }
                  className="min-w-52 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] text-zinc-300 placeholder:text-zinc-700"
                />
              </div>
            </article>
          );
        })}
      </section>
      </div>
      </div>
    </div>
  );
}

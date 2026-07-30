'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import type {
  CampaignJobRecord,
  CampaignJobStepRecord,
} from '@/lib/gtm/campaign-jobs';
import { resolveLaunchChannelIds } from '@/lib/gtm/launch';
import type { GtmStore } from '@/lib/gtm/types';

type JobResponse = {
  job: CampaignJobRecord;
  steps: CampaignJobStepRecord[];
};

/**
 * Enqueue the paid Campaign once, then mirror durable server progress into the
 * local UI. Server `after()` drains multiple steps per poll, so briefly leaving
 * the tab does not need to pause the in-flight worker.
 */
export default function CampaignBootstrap() {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const gtm = useGtm();
  const router = useRouter();
  const pathname = usePathname();
  const activeBuildRef = useRef<string | null>(null);
  const terminalBuildRef = useRef<string | null>(null);
  const gtmRef = useRef(gtm);
  gtmRef.current = gtm;

  const paid = gtm.store.paid;
  const hydrated = gtm.hydrated;
  const remoteReady = gtm.remoteReady;
  const launch = gtm.store.launch;
  const planReady = gtm.store.planReady;
  const phase = launch?.project.phase;
  const hasBrief = Boolean(launch?.brief);
  const buildKey = launch
    ? `campaign:${launch.project.id}:${launch.project.createdAt}`
    : null;
  const selectedChannelIds = launch?.selectedChannelIds ?? [];
  const channelIds = launch ? resolveLaunchChannelIds(gtm.store) : [];
  const shouldBuild =
    Boolean(hydrated && remoteReady && paid && launch && hasBrief && !planReady) &&
    channelIds.length > 0 &&
    (phase === 'building_team' ||
      (phase === 'brief_ready' && selectedChannelIds.length > 0));

  useEffect(() => {
    if (!shouldBuild || !launch || !buildKey) return;
    if (activeBuildRef.current === buildKey) return;
    activeBuildRef.current = buildKey;
    let cancelled = false;
    let pollTimer: number | null = null;

    if (pathname.includes('/brief') || pathname.includes('/calendar')) {
      router.replace('/app');
    }

    const syncRemoteStore = async () => {
      const response = await fetch('/api/gtm/state', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        store?: GtmStore;
        revision?: string;
      };
      if (payload.store && !cancelled) {
        gtmRef.current.adoptRemoteStore(payload.store, payload.revision);
      }
    };

    const poll = async (jobId: string) => {
      if (cancelled) return;
      try {
        const response = await fetch(`/api/gtm/campaign-jobs/${jobId}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Campaign status failed (${response.status})`);
        }
        const payload = (await response.json()) as JobResponse;
        await syncRemoteStore();
        if (cancelled) return;
        if (payload.job.status === 'completed') {
          activeBuildRef.current = null;
          if (terminalBuildRef.current !== buildKey) {
            terminalBuildRef.current = buildKey;
            gtmRef.current.addAgentNotification({
              title: isZh
                ? '30 天冷启动已就绪'
                : 'Your 30-day launch is ready',
              summary: isZh
                ? 'Campaign Blueprint、渠道策略和任务日历已在后台完成。'
                : 'The Campaign Blueprint, channel strategies, and task calendar finished in the background.',
              priority: 'important',
            });
          }
          return;
        }
        if (payload.job.status === 'failed') {
          activeBuildRef.current = null;
          if (terminalBuildRef.current !== buildKey) {
            terminalBuildRef.current = buildKey;
            gtmRef.current.addDirectorMessage({
              role: 'assistant',
              content: isZh
                ? `后台 Campaign 在 ${payload.job.current_step ?? '当前步骤'} 失败：${payload.job.last_error ?? '未知错误'}。已完成步骤会保留，可从失败步骤重试。`
                : `The background Campaign failed at ${payload.job.current_step ?? 'the current step'}: ${payload.job.last_error ?? 'unknown error'}. Completed steps are preserved for retry.`,
            });
          }
          return;
        }
        pollTimer = window.setTimeout(() => void poll(jobId), 3_000);
      } catch {
        if (!cancelled) {
          pollTimer = window.setTimeout(() => void poll(jobId), 8_000);
        }
      }
    };

    void (async () => {
      const maxAttempts = 4;
      let lastError: unknown;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (cancelled) return;
        try {
          const response = await fetch('/api/gtm/campaign-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              store: {
                ...gtmRef.current.store,
                launch: { ...launch, campaignBuildId: buildKey },
              },
              locale,
            }),
          });
          if (response.status === 409 || response.status >= 500) {
            throw new Error(
              `Campaign enqueue failed (${response.status})`
            );
          }
          if (!response.ok) {
            const error = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(
              error.error ?? `Campaign enqueue failed (${response.status})`
            );
          }
          const payload = (await response.json()) as JobResponse;
          if (cancelled) return;
          gtmRef.current.addDirectorMessage({
            role: 'assistant',
            content: isZh
              ? '支付已确认。Campaign 已在后台组装中，你可以继续聊天或切换到其他应用；进度会自动保存。'
              : 'Payment confirmed. Your Campaign is assembling in the background — you can keep chatting or switch apps; progress is saved automatically.',
          });
          void poll(payload.job.id);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, 500 * 2 ** attempt)
            );
          }
        }
      }
      activeBuildRef.current = null;
      if (!cancelled && terminalBuildRef.current !== buildKey) {
        terminalBuildRef.current = buildKey;
        gtmRef.current.addDirectorMessage({
          role: 'assistant',
          content: isZh
            ? `无法启动后台 Campaign：${lastError instanceof Error ? lastError.message : '未知错误'}。`
            : `Could not start the background Campaign: ${lastError instanceof Error ? lastError.message : 'unknown error'}.`,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, [
    buildKey,
    isZh,
    locale,
    shouldBuild,
  ]);

  return null;
}

import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { getAgentAccess } from '../_lib/auth';
import { getChannelCatalog } from '@/lib/agents/catalog';
import {
  enqueueChannelPlanJob,
  getCampaignJob,
  getLatestCampaignJob,
  isChannelPlansJob,
  listCampaignJobSteps,
} from '@/lib/gtm/campaign-jobs';
import { drainCampaignJobs } from '@/lib/gtm/campaign-worker';
import {
  GtmStateConflictError,
  isGtmStore,
  loadGtmStore,
  saveGtmStoreWithConflictRetry,
} from '@/lib/gtm/database';
import { resolvePendingChannelPlanIds } from '@/lib/gtm/launch';
import type { GtmStore } from '@/lib/gtm/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_CHANNELS = new Set(
  getChannelCatalog().map((channel) => channel.channelId)
);

function normalizeChannelIds(value: unknown): string[] {
  return [
    ...new Set(
      (Array.isArray(value) ? value : []).filter(
        (channelId): channelId is string =>
          typeof channelId === 'string' && ALLOWED_CHANNELS.has(channelId)
      )
    ),
  ].slice(0, 16);
}

function buildKey(launchId: string, channelIds: string[], force: boolean): string {
  const digest = [...channelIds].sort().join(',');
  if (force) {
    return `channel-plans:${launchId}:${digest}:${Date.now()}`;
  }
  return `channel-plans:${launchId}:${digest}`;
}

export async function GET(request: Request) {
  try {
    const access = await getAgentAccess();
    if (!access.allowed || !access.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = new URL(request.url).searchParams.get('jobId');
    const job = jobId
      ? await getCampaignJob(access.userId, jobId)
      : await getLatestCampaignJob(access.userId);

    if (!job || !isChannelPlansJob(job)) {
      return NextResponse.json({ job: null, steps: [] });
    }

    const steps = await listCampaignJobSteps(access.userId, job.id);
    if (job.status === 'queued' || job.status === 'running') {
      after(async () => {
        await drainCampaignJobs(`channel-plans-poll-${crypto.randomUUID()}`);
      });
    }

    return NextResponse.json({ job, steps });
  } catch (error) {
    console.error('Failed to load channel-plan job:', error);
    return NextResponse.json(
      { error: 'Failed to load channel-plan job' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getAgentAccess();
    if (!access.allowed || !access.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      channelIds?: unknown;
      locale?: unknown;
      taskMessageId?: unknown;
      force?: unknown;
      store?: unknown;
    };

    const requestedIds = normalizeChannelIds(body.channelIds);
    if (requestedIds.length === 0) {
      return NextResponse.json({ error: 'channelIds required' }, { status: 400 });
    }
    if (!isGtmStore(body.store) || !body.store.launch) {
      return NextResponse.json(
        { error: 'A valid Store with Launch state is required' },
        { status: 400 }
      );
    }

    const force = body.force === true;
    const taskMessageId =
      typeof body.taskMessageId === 'string' && body.taskMessageId.trim()
        ? body.taskMessageId.trim().slice(0, 160)
        : '';
    const locale = body.locale === 'zh' ? 'zh' : 'en';

    // Prefer durable remote state so "continue" sees already-ready plans.
    let baseStore: GtmStore = body.store;
    try {
      const remote = await loadGtmStore(access.userId);
      if (remote.hasRemoteData) {
        baseStore = {
          ...remote.store,
          // Keep the freshest chat bubble the client just appended.
          directorChat:
            body.store.directorChat.length >= remote.store.directorChat.length
              ? body.store.directorChat
              : remote.store.directorChat,
        };
      }
    } catch {
      // Fall back to the client snapshot when remote load fails.
    }

    const launch = baseStore.launch;
    if (!launch) {
      return NextResponse.json(
        { error: 'A valid Store with Launch state is required' },
        { status: 400 }
      );
    }

    const pendingIds = resolvePendingChannelPlanIds(baseStore, requestedIds, {
      force,
    });
    if (pendingIds.length === 0) {
      return NextResponse.json({
        job: null,
        steps: [],
        skipped: true,
        reason: 'all_ready',
        channelIds: [],
      });
    }

    const active = await getLatestCampaignJob(access.userId);
    if (
      active &&
      (active.status === 'queued' || active.status === 'running') &&
      isChannelPlansJob(active)
    ) {
      const steps = await listCampaignJobSteps(access.userId, active.id);
      after(async () => {
        await drainCampaignJobs(`channel-plans-resume-${crypto.randomUUID()}`);
      });
      return NextResponse.json({ job: active, steps, resumed: true }, { status: 202 });
    }

    if (
      active &&
      (active.status === 'queued' || active.status === 'running') &&
      !isChannelPlansJob(active)
    ) {
      return NextResponse.json(
        { error: 'Another campaign job is already running' },
        { status: 409 }
      );
    }

    const launchId = launch.project.id;
    const key = buildKey(launchId, pendingIds, force);
    const store: GtmStore = {
      ...baseStore,
      paid: true,
      launch: {
        ...launch,
        channelPlanJob: {
          jobId: '',
          taskMessageId,
          channelIds: pendingIds,
          completedCount: 0,
          totalCount: pendingIds.length,
          force,
          updatedAt: Date.now(),
        },
        project: {
          ...launch.project,
          updatedAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    };

    // Patch the running task label to the real pending count before work starts.
    if (taskMessageId) {
      store.directorChat = store.directorChat.map((message) =>
        message.id === taskMessageId
          ? {
              ...message,
              card: {
                kind: 'agent-task' as const,
                label:
                  locale === 'zh'
                    ? `渠道专员正在编写计划（0/${pendingIds.length}）…`
                    : `Writing channel plans (0/${pendingIds.length})…`,
                status: 'running' as const,
              },
            }
          : message
      );
    }

    await saveGtmStoreWithConflictRetry(access.userId, store);
    const job = await enqueueChannelPlanJob({
      clerkUserId: access.userId,
      buildKey: key,
      locale,
      store,
      channelIds: pendingIds,
    });

    const withJobId: GtmStore = {
      ...store,
      launch: store.launch
        ? {
            ...store.launch,
            channelPlanJob: {
              jobId: job.id,
              taskMessageId,
              channelIds: pendingIds,
              completedCount: 0,
              totalCount: pendingIds.length,
              force,
              updatedAt: Date.now(),
            },
          }
        : store.launch,
      updatedAt: Date.now(),
    };
    if (taskMessageId) {
      withJobId.directorChat = withJobId.directorChat.map((message) =>
        message.id === taskMessageId
          ? { ...message, agentJobId: job.id }
          : message
      );
    }
    await saveGtmStoreWithConflictRetry(access.userId, withJobId);

    const steps = await listCampaignJobSteps(access.userId, job.id);
    after(async () => {
      await drainCampaignJobs(`channel-plans-enqueue-${crypto.randomUUID()}`);
    });

    return NextResponse.json(
      { job, steps, channelIds: pendingIds, resumed: false },
      { status: 202 }
    );
  } catch (error) {
    console.error('Failed to enqueue channel-plan job:', error);
    if (error instanceof GtmStateConflictError) {
      return NextResponse.json(
        { error: 'State changed in another session' },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Active campaign job already running')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to enqueue channel-plan job' },
      { status: 500 }
    );
  }
}

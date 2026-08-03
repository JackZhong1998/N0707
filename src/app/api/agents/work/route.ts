import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { getAgentAccess } from '../_lib/auth';
import {
  actionsFingerprint,
  enqueueAgentWorkJob,
  getAgentWorkJob,
  getLatestActiveAgentWorkJob,
  listAgentWorkSteps,
} from '@/lib/gtm/agent-work-jobs';
import {
  defaultWorkLabel,
  expandDirectorActionsToSteps,
} from '@/lib/gtm/agent-work-expand';
import { drainAgentWorkJobs } from '@/lib/gtm/agent-work-worker';
import { drainCampaignJobs } from '@/lib/gtm/campaign-worker';
import {
  GtmStateConflictError,
  isGtmStore,
  loadGtmStore,
  saveGtmStoreWithConflictRetry,
} from '@/lib/gtm/database';
import type { DirectorAction, GtmStore } from '@/lib/gtm/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isDirectorAction(value: unknown): value is DirectorAction {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { type?: unknown }).type === 'string'
  );
}

async function drainAll(workerPrefix: string) {
  const campaign = await drainCampaignJobs(`${workerPrefix}-campaign`, 120_000);
  const remainingMs = Math.max(30_000, 240_000 - 120_000);
  const work = await drainAgentWorkJobs(`${workerPrefix}-work`, remainingMs);
  return { campaign, work };
}

export async function GET(request: Request) {
  try {
    const access = await getAgentAccess();
    if (!access.allowed || !access.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const jobId = new URL(request.url).searchParams.get('jobId');
    const job = jobId
      ? await getAgentWorkJob(access.userId, jobId)
      : await getLatestActiveAgentWorkJob(access.userId);
    if (!job) {
      return NextResponse.json({ job: null, steps: [] });
    }
    const steps = await listAgentWorkSteps(access.userId, job.id);
    if (job.status === 'queued' || job.status === 'running') {
      after(async () => {
        await drainAll(`work-poll-${crypto.randomUUID()}`);
      });
    }
    return NextResponse.json({ job, steps });
  } catch (error) {
    console.error('Failed to load agent work job:', error);
    return NextResponse.json(
      { error: 'Failed to load agent work job' },
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
      actions?: unknown;
      locale?: unknown;
      taskMessageId?: unknown;
      buildKey?: unknown;
      store?: unknown;
      label?: unknown;
    };

    const actions = (Array.isArray(body.actions) ? body.actions : []).filter(
      isDirectorAction
    );
    if (actions.length === 0) {
      return NextResponse.json({ error: 'actions required' }, { status: 400 });
    }
    if (!isGtmStore(body.store)) {
      return NextResponse.json({ error: 'Valid store required' }, { status: 400 });
    }

    const locale = body.locale === 'zh' ? 'zh' : 'en';
    const isZh = locale === 'zh';
    const taskMessageId =
      typeof body.taskMessageId === 'string' ? body.taskMessageId.slice(0, 160) : '';
    const label =
      typeof body.label === 'string' && body.label.trim()
        ? body.label.trim().slice(0, 200)
        : defaultWorkLabel(actions, isZh);

    let baseStore: GtmStore = body.store;
    try {
      const remote = await loadGtmStore(access.userId);
      if (remote.hasRemoteData) {
        // The browser has the newest market/language and optimistic writing
        // state for the Todo that triggered this job. The debounced state PUT
        // may still be in flight, so keep that targeted Todo while taking all
        // unrelated durable worker output from the server.
        const targetedTodoIds = new Set(
          actions.flatMap((action) =>
            action.type === 'generate_todo_content' ||
            action.type === 'rewrite_todo_content'
              ? [action.todoId]
              : []
          )
        );
        const clientTargetTodos = body.store.todos.filter((todo) =>
          targetedTodoIds.has(todo.id)
        );
        baseStore = {
          ...remote.store,
          directorChat:
            body.store.directorChat.length >= remote.store.directorChat.length
              ? body.store.directorChat
              : remote.store.directorChat,
          todos:
            targetedTodoIds.size > 0
              ? [
                  ...remote.store.todos.filter(
                    (todo) => !targetedTodoIds.has(todo.id)
                  ),
                  ...clientTargetTodos,
                ]
              : remote.store.todos,
        };
      }
    } catch {
      // Use client snapshot.
    }

    const active = await getLatestActiveAgentWorkJob(access.userId);
    if (active) {
      const steps = await listAgentWorkSteps(access.userId, active.id);
      after(async () => {
        await drainAll(`work-resume-${crypto.randomUUID()}`);
      });
      return NextResponse.json(
        { job: active, steps, resumed: true },
        { status: 202 }
      );
    }

    const steps = expandDirectorActionsToSteps(actions, baseStore);
    if (steps.length === 0) {
      return NextResponse.json({
        job: null,
        steps: [],
        skipped: true,
        reason: 'no_steps',
      });
    }

    const launchId = baseStore.launch?.project.id ?? 'project';
    const buildKey =
      typeof body.buildKey === 'string' && body.buildKey.length >= 8
        ? body.buildKey.slice(0, 240)
        : `work:${launchId}:${actionsFingerprint(actions)}:${Date.now()}`;

    const store: GtmStore = {
      ...baseStore,
      paid: true,
      launch: baseStore.launch
        ? {
            ...baseStore.launch,
            activeAgentWorkJob: {
              jobId: '',
              taskMessageId,
              label,
              completedCount: 0,
              totalCount: steps.length,
              updatedAt: Date.now(),
            },
            project: {
              ...baseStore.launch.project,
              updatedAt: Date.now(),
            },
          }
        : baseStore.launch,
      updatedAt: Date.now(),
    };

    if (taskMessageId) {
      store.directorChat = store.directorChat.map((message) =>
        message.id === taskMessageId
          ? {
              ...message,
              card: {
                kind: 'agent-task' as const,
                label: isZh
                  ? `${label.replace(/…$/, '')}（0/${steps.length}）…`
                  : `${label.replace(/\.\.\.$/, '')} (0/${steps.length})…`,
                status: 'running' as const,
              },
            }
          : message
      );
    }

    await saveGtmStoreWithConflictRetry(access.userId, store);
    const job = await enqueueAgentWorkJob({
      clerkUserId: access.userId,
      buildKey,
      locale,
      store,
      meta: {
        taskMessageId,
        label,
        actions,
      },
      steps,
    });

    const withJob: GtmStore = {
      ...store,
      launch: store.launch
        ? {
            ...store.launch,
            activeAgentWorkJob: {
              jobId: job.id,
              taskMessageId,
              label,
              completedCount: 0,
              totalCount: steps.length,
              updatedAt: Date.now(),
            },
          }
        : store.launch,
      directorChat: store.directorChat.map((message) =>
        message.id === taskMessageId
          ? { ...message, agentJobId: job.id }
          : message
      ),
      updatedAt: Date.now(),
    };
    await saveGtmStoreWithConflictRetry(access.userId, withJob);

    const jobSteps = await listAgentWorkSteps(access.userId, job.id);
    after(async () => {
      await drainAll(`work-enqueue-${crypto.randomUUID()}`);
    });

    return NextResponse.json(
      { job, steps: jobSteps, resumed: false },
      { status: 202 }
    );
  } catch (error) {
    console.error('Failed to enqueue agent work:', error);
    if (error instanceof GtmStateConflictError) {
      return NextResponse.json(
        { error: 'State changed in another session' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to enqueue agent work' },
      { status: 500 }
    );
  }
}

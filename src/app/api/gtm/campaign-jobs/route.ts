import { auth } from '@clerk/nextjs/server';
import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
  enqueueCampaignJob,
  getLatestCampaignJob,
  listCampaignJobSteps,
} from '@/lib/gtm/campaign-jobs';
import { isGtmStore, saveGtmStore } from '@/lib/gtm/database';
import {
  createCampaignBuildSteps,
  SUPPORTED_LAUNCH_CHANNELS,
} from '@/lib/gtm/launch';
import { processNextCampaignJob } from '@/lib/gtm/campaign-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PAID_STATUSES = new Set(['active', 'trialing']);

async function paidUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const { data, error } = await getServiceSupabase()
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return PAID_STATUSES.has(data?.status ?? '') ? userId : null;
}

export async function GET() {
  try {
    const userId = await paidUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Paid access required' }, { status: 403 });
    }
    const job = await getLatestCampaignJob(userId);
    const steps = job ? await listCampaignJobSteps(userId, job.id) : [];
    if (job && (job.status === 'queued' || job.status === 'running')) {
      after(async () => {
        await processNextCampaignJob(`browser-poll-${crypto.randomUUID()}`);
      });
    }
    return NextResponse.json({ job, steps });
  } catch (error) {
    console.error('Failed to load latest Campaign job:', error);
    return NextResponse.json(
      { error: 'Failed to load Campaign job' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await paidUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Paid access required' }, { status: 403 });
    }
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 4_000_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    const body = (await request.json()) as {
      store?: unknown;
      locale?: unknown;
    };
    if (!isGtmStore(body.store) || !body.store.launch?.brief) {
      return NextResponse.json(
        { error: 'A valid Store with Launch Brief is required' },
        { status: 400 }
      );
    }

    const launchId = body.store.launch.project.id;
    const buildKey = `campaign:${launchId}:${body.store.launch.project.createdAt}`;
    const locale = body.locale === 'zh' ? 'zh' : 'en';
    const channelIds = SUPPORTED_LAUNCH_CHANNELS.map(
      (channel) => channel.channelId
    );
    const store = {
      ...body.store,
      paid: true,
      channels: channelIds,
      launch: {
        ...body.store.launch,
        campaignBuildId: buildKey,
        researchProgress: createCampaignBuildSteps(locale === 'zh'),
        project: {
          ...body.store.launch.project,
          phase: 'building_team' as const,
          status: 'building' as const,
          updatedAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    };

    // The Brief must be durable before a worker can claim the job.
    await saveGtmStore(userId, store);
    const job = await enqueueCampaignJob({
      clerkUserId: userId,
      buildKey,
      locale,
      store,
      channelIds,
    });
    const steps = await listCampaignJobSteps(userId, job.id);
    after(async () => {
      await processNextCampaignJob(`enqueue-${crypto.randomUUID()}`);
    });
    return NextResponse.json({ job, steps }, { status: 202 });
  } catch (error) {
    console.error('Failed to enqueue Campaign job:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue Campaign job' },
      { status: 500 }
    );
  }
}

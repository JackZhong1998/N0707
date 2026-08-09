import { auth } from '@clerk/nextjs/server';
import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
  getLatestCampaignJob,
  listCampaignJobSteps,
} from '@/lib/gtm/campaign-jobs';
import { drainCampaignJobs } from '@/lib/gtm/campaign-worker';

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

/** Read and finish old jobs only. New work uses per-channel Agent jobs. */
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
        await drainCampaignJobs(`legacy-job-poll-${crypto.randomUUID()}`);
      });
    }
    return NextResponse.json({ job, steps });
  } catch (error) {
    console.error('Failed to load latest legacy job:', error);
    return NextResponse.json(
      { error: 'Failed to load legacy job' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        'This legacy campaign build endpoint is retired. Generate selected channel plans instead.',
    },
    { status: 410 }
  );
}

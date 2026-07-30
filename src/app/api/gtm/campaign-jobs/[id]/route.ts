import { auth } from '@clerk/nextjs/server';
import { after } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getCampaignJob,
  listCampaignJobSteps,
} from '@/lib/gtm/campaign-jobs';
import { drainCampaignJobs } from '@/lib/gtm/campaign-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }
  try {
    const job = await getCampaignJob(userId, id);
    if (!job) {
      return NextResponse.json({ error: 'Campaign job not found' }, { status: 404 });
    }
    const steps = await listCampaignJobSteps(userId, job.id);
    if (job.status === 'queued' || job.status === 'running') {
      after(async () => {
        await drainCampaignJobs(`job-poll-${crypto.randomUUID()}`);
      });
    }
    return NextResponse.json({ job, steps });
  } catch (error) {
    console.error('Failed to load Campaign job:', error);
    return NextResponse.json(
      { error: 'Failed to load Campaign job' },
      { status: 500 }
    );
  }
}

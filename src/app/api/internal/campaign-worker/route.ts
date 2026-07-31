import { randomUUID, timingSafeEqual } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { drainAgentWorkJobs } from '@/lib/gtm/agent-work-worker';
import { drainCampaignJobs } from '@/lib/gtm/campaign-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || !authorization?.startsWith('Bearer ')) return false;
  const provided = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

async function drainBothQueues(workerId: string) {
  const campaign = await drainCampaignJobs(`${workerId}-campaign`, 120_000);
  const work = await drainAgentWorkJobs(`${workerId}-work`, 150_000);
  return { campaign, work };
}

/**
 * Global offline worker wake-up.
 * Point cron-job.org (every 1–2 minutes) at this URL with:
 *   Authorization: Bearer $CRON_SECRET
 *
 * External schedulers usually abort after ~30s, so the response is returned
 * immediately and the queues keep draining in `after()` for the rest of the
 * function lifetime. Append `?wait=1` to block and inspect the drain result.
 */
async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerId = `nowbuild-${randomUUID()}`;

  if (new URL(request.url).searchParams.get('wait') === '1') {
    try {
      const drained = await drainBothQueues(workerId);
      return NextResponse.json({
        ok: true,
        mode: 'sync',
        ...drained,
        drainedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Background worker failed:', error);
      return NextResponse.json(
        { error: 'Background worker failed' },
        { status: 500 }
      );
    }
  }

  after(async () => {
    try {
      await drainBothQueues(workerId);
    } catch (error) {
      console.error('Background worker failed:', error);
    }
  });

  return NextResponse.json({
    ok: true,
    mode: 'async',
    workerId,
    acceptedAt: new Date().toISOString(),
  });
}

export const GET = run;
export const POST = run;

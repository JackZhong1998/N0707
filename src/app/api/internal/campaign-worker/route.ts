import { randomUUID, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
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

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const workerId = `nowbuild-${randomUUID()}`;
    const result = await drainCampaignJobs(workerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Campaign worker failed:', error);
    return NextResponse.json(
      { error: 'Campaign worker failed' },
      { status: 500 }
    );
  }
}

export const GET = run;
export const POST = run;

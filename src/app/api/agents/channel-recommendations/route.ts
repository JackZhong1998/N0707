import { NextResponse } from 'next/server';
import { runChannelRecommender } from '@/lib/agents/channel-recommender';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 300;

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await runChannelRecommender({
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc: text(body.projectProfileDoc, 24_000),
      conversationDigest: text(body.conversationDigest, 12_000),
      campaignContext: text(body.campaignContext, 60_000),
      locale: body.locale === 'en' ? 'en' : 'zh',
      feedback: text(body.feedback, 4_000) || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('channel recommender error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { runStrategist, type StrategistInput } from '@/lib/agents/strategist';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as StrategistInput;
    if (!body.channelIds || body.channelIds.length === 0) {
      return NextResponse.json({ error: 'channelIds required' }, { status: 400 });
    }
    const result = await runStrategist({
      channelIds: body.channelIds,
      userProfileDoc: body.userProfileDoc ?? '',
      projectProfileDoc: body.projectProfileDoc ?? '',
      conversationDigest: body.conversationDigest ?? '',
      feedback: body.feedback,
      existingOverview: body.existingOverview,
      locale: body.locale ?? 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('strategist agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

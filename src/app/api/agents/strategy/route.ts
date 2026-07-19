import { NextResponse } from 'next/server';
import { runStrategist } from '@/lib/agents/strategist';
import { getChannelCatalog } from '@/lib/agents/catalog';
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
    const payload = await request.json();
    const body =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const allowed = new Set(
      getChannelCatalog().map((channel) => channel.channelId)
    );
    const channelIds = [
      ...new Set(
        (Array.isArray(body.channelIds) ? body.channelIds : []).filter(
          (channelId): channelId is string =>
            typeof channelId === 'string' && allowed.has(channelId)
        )
      ),
    ].slice(0, 8);
    if (channelIds.length === 0) {
      return NextResponse.json({ error: 'channelIds required' }, { status: 400 });
    }
    const result = await runStrategist({
      channelIds,
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc: text(body.projectProfileDoc, 24_000),
      conversationDigest: text(body.conversationDigest, 12_000),
      feedback: text(body.feedback, 4_000) || undefined,
      performanceContext: text(body.performanceContext, 30_000) || undefined,
      existingOverview: text(body.existingOverview, 30_000) || undefined,
      locale: body.locale === 'en' ? 'en' : 'zh',
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

import { NextResponse } from 'next/server';
import { runChannelWrite } from '@/lib/agents/specialist';
import { getChannelCatalog } from '@/lib/agents/catalog';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 180;

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
    const todo =
      body.todo && typeof body.todo === 'object'
        ? (body.todo as Record<string, unknown>)
        : {};
    const channelId = text(todo.channelId, 80);
    const allowed = new Set(
      getChannelCatalog().map((channel) => channel.channelId)
    );
    const title = text(todo.title, 500);
    const brief = text(todo.brief, 2_000);
    if (!allowed.has(channelId) || !title || !brief) {
      return NextResponse.json({ error: 'todo required' }, { status: 400 });
    }
    const result = await runChannelWrite({
      todo: {
        channelId,
        title,
        brief,
        dayIndex:
          typeof todo.dayIndex === 'number' && Number.isFinite(todo.dayIndex)
            ? Math.max(1, Math.min(30, Math.trunc(todo.dayIndex)))
            : 1,
        phase: text(todo.phase, 300) || undefined,
        market: text(todo.market, 300) || undefined,
        targetMarketId: text(todo.targetMarketId, 160) || undefined,
        outputLocale: text(todo.outputLocale, 40) || undefined,
        audience: text(todo.audience, 500) || undefined,
        purpose: text(todo.purpose, 1_000) || undefined,
        pillar: text(todo.pillar, 500) || undefined,
        taskType: text(todo.taskType, 120) || undefined,
      },
      channelStrategyMarkdown: text(body.channelStrategyMarkdown, 30_000),
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc: text(body.projectProfileDoc, 24_000),
      campaignContext: text(body.campaignContext, 60_000),
      locale: body.locale === 'en' ? 'en' : 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('channel-write agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

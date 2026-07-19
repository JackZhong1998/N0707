import { NextResponse } from 'next/server';
import { runChannelChat } from '@/lib/agents/specialist';
import { getChannelCatalog } from '@/lib/agents/catalog';
import type { ChatMessage } from '@/lib/gtm/types';
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
    const message = text(body.message, 12_000).trim();
    const allowed = new Set(
      getChannelCatalog().map((channel) => channel.channelId)
    );
    if (!allowed.has(channelId) || !message) {
      return NextResponse.json({ error: 'todo and message required' }, { status: 400 });
    }
    const current =
      body.currentContent && typeof body.currentContent === 'object'
        ? (body.currentContent as Record<string, unknown>)
        : undefined;
    const history = (Array.isArray(body.history) ? body.history : [])
      .slice(-10)
      .flatMap((entry): ChatMessage[] => {
        if (!entry || typeof entry !== 'object') return [];
        const item = entry as Record<string, unknown>;
        if (item.role !== 'user' && item.role !== 'assistant') return [];
        const content = text(item.content, 12_000);
        if (!content) return [];
        return [
          {
            id: text(item.id, 160) || crypto.randomUUID(),
            role: item.role,
            content,
            createdAt:
              typeof item.createdAt === 'number' &&
              Number.isFinite(item.createdAt)
                ? item.createdAt
                : Date.now(),
          },
        ];
      });
    const result = await runChannelChat({
      todo: {
        id: text(todo.id, 160) || crypto.randomUUID(),
        channelId,
        title: text(todo.title, 500),
        brief: text(todo.brief, 2_000),
        dayIndex:
          typeof todo.dayIndex === 'number' && Number.isFinite(todo.dayIndex)
            ? Math.max(1, Math.min(30, Math.trunc(todo.dayIndex)))
            : 1,
        phase: text(todo.phase, 300) || undefined,
      },
      currentContent: current
        ? {
            title: text(current.title, 1_000),
            body: text(current.body, 60_000),
          }
        : undefined,
      history,
      message,
      channelStrategyMarkdown: text(body.channelStrategyMarkdown, 30_000),
      channelTodosDigest: text(body.channelTodosDigest, 30_000),
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc: text(body.projectProfileDoc, 24_000),
      locale: body.locale === 'en' ? 'en' : 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('channel-chat agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

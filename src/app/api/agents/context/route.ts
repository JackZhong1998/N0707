import { NextResponse } from 'next/server';
import { runContextAgent } from '@/lib/agents/context-agent';
import type { ChatMessage, MemoryFact } from '@/lib/gtm/types';
import type { ViewContext } from '@/lib/gtm/view-context';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 60;

function text(value: unknown, maxLength: number, fallback = ''): string {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength) || fallback
    : fallback;
}

function viewContext(value: unknown): ViewContext | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  const view = text(item.view, 80);
  if (!view) return undefined;
  return {
    view,
    path: text(item.path, 300) || undefined,
    entityType: text(item.entityType, 80) || undefined,
    entityId: text(item.entityId, 160) || undefined,
    title: text(item.title, 300) || undefined,
    channelId: text(item.channelId, 80) || undefined,
    section: text(item.section, 160) || undefined,
    selectedText: text(item.selectedText, 2_000) || undefined,
    revision:
      typeof item.revision === 'number' && Number.isFinite(item.revision)
        ? item.revision
        : text(item.revision, 80) || undefined,
  };
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
    const recentMessages = (Array.isArray(body.recentMessages)
      ? body.recentMessages
      : []
    )
      .slice(-40)
      .flatMap((message): ChatMessage[] => {
        if (!message || typeof message !== 'object') return [];
        const item = message as Record<string, unknown>;
        if (item.role !== 'user' && item.role !== 'assistant') return [];
        const content = text(item.content, 12_000);
        if (!content) return [];
        return [
          {
            id: text(item.id, 160, crypto.randomUUID()),
            role: item.role,
            content,
            createdAt:
              typeof item.createdAt === 'number' &&
              Number.isFinite(item.createdAt)
                ? item.createdAt
                : Date.now(),
            contextRef: viewContext(item.contextRef),
          },
        ];
      });
    const memoryFacts = (Array.isArray(body.memoryFacts)
      ? body.memoryFacts
      : []
    )
      .slice(-120)
      .flatMap((fact): MemoryFact[] => {
        if (!fact || typeof fact !== 'object') return [];
        const item = fact as Record<string, unknown>;
        if (
          !['identity', 'preference', 'product', 'decision', 'learning'].includes(
            String(item.category)
          )
        ) {
          return [];
        }
        const key = text(item.key, 80);
        const value = text(item.value, 1_200);
        if (!key || !value) return [];
        return [
          {
            id: text(item.id, 160, crypto.randomUUID()),
            category: item.category as MemoryFact['category'],
            key,
            value,
            confidence:
              typeof item.confidence === 'number'
                ? Math.max(0, Math.min(1, item.confidence))
                : 0.5,
            confirmed: item.confirmed === true,
            sourceMessageIds: (Array.isArray(item.sourceMessageIds)
              ? item.sourceMessageIds
              : []
            )
              .filter((id): id is string => typeof id === 'string')
              .slice(-24),
            updatedAt:
              typeof item.updatedAt === 'number' &&
              Number.isFinite(item.updatedAt)
                ? item.updatedAt
                : Date.now(),
          },
        ];
      });
    const result = await runContextAgent({
      recentMessages,
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc: text(body.projectProfileDoc, 24_000),
      conversationSummary: text(body.conversationSummary, 4_000),
      memoryFacts,
      locale: body.locale === 'en' ? 'en' : 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('context agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

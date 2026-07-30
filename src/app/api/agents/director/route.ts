import { NextResponse } from 'next/server';
import { runDirector, type DirectorInput } from '@/lib/agents/director';
import type { ChatMessage, MemoryFact, Todo } from '@/lib/gtm/types';
import { checkSignedIn } from '../_lib/auth';

export const maxDuration = 120;

function optionalString(
  value: unknown,
  maxLength: number
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function text(value: unknown, maxLength: number, fallback = ''): string {
  return optionalString(value, maxLength) ?? fallback;
}

/**
 * Keep this validation in the server route. The UI ViewContext provider is a
 * client module and must not become a runtime dependency of this route.
 */
function normalizeDirectorViewContext(
  value: unknown
): DirectorInput['viewContext'] {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const view = optionalString(raw.view, 80);
  if (!view) return undefined;

  const revision =
    typeof raw.revision === 'number' && Number.isFinite(raw.revision)
      ? raw.revision
      : optionalString(raw.revision, 80);

  return {
    view,
    path: optionalString(raw.path, 300),
    entityType: optionalString(raw.entityType, 80),
    entityId: optionalString(raw.entityId, 160),
    title: optionalString(raw.title, 300),
    channelId: optionalString(raw.channelId, 80),
    section: optionalString(raw.section, 160),
    selectedText: optionalString(raw.selectedText, 2_000),
    revision,
  };
}

export async function POST(request: Request) {
  // Free tier needs director chat to correct Launch Brief before checkout.
  if (!(await checkSignedIn())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const payload = await request.json();
    const body =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const history = (Array.isArray(body.history) ? body.history : [])
      .filter(
        (message): message is Record<string, unknown> =>
          Boolean(message) &&
          typeof message === 'object' &&
          (message as Record<string, unknown>).role !== undefined
      )
      .slice(-50)
      .flatMap((message): ChatMessage[] => {
        if (message.role !== 'user' && message.role !== 'assistant') return [];
        const content = text(message.content, 12_000);
        if (!content) return [];
        return [
          {
            id: text(message.id, 160, crypto.randomUUID()),
            role: message.role,
            content,
            createdAt:
              typeof message.createdAt === 'number' &&
              Number.isFinite(message.createdAt)
                ? message.createdAt
                : Date.now(),
            contextRef: normalizeDirectorViewContext(message.contextRef),
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
    const todos = (Array.isArray(body.todos) ? body.todos : [])
      .slice(0, 600)
      .flatMap((todo): DirectorInput['todos'] => {
        if (!todo || typeof todo !== 'object') return [];
        const item = todo as Record<string, unknown>;
        const id = text(item.id, 160);
        const date = text(item.date, 10);
        const title = text(item.title, 500);
        const channelName = text(item.channelName, 160);
        if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) return [];
        return [
          {
            id,
            date,
            time: optionalString(item.time, 10),
            title,
            channelName,
            status: ['pending', 'done', 'skipped'].includes(String(item.status))
              ? (item.status as Todo['status'])
              : 'pending',
          },
        ];
      });
    const result = await runDirector({
      message: text(body.message, 12_000),
      history,
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc: text(body.projectProfileDoc, 24_000),
      conversationSummary: text(body.conversationSummary, 4_000),
      memoryFacts,
      hasStrategy: Boolean(body.hasStrategy),
      hasTodos: Boolean(body.hasTodos),
      hasChannelRecommendations: Boolean(body.hasChannelRecommendations),
      selectedChannelIds: (Array.isArray(body.selectedChannelIds)
        ? body.selectedChannelIds
        : []
      )
        .filter((channel): channel is string => typeof channel === 'string')
        .slice(0, 20),
      channels: (Array.isArray(body.channels) ? body.channels : [])
        .filter((channel): channel is string => typeof channel === 'string')
        .slice(0, 20),
      todos,
      performanceContext: text(
        body.performanceContext,
        30_000,
        '尚无已发布帖子。'
      ),
      viewContext: normalizeDirectorViewContext(body.viewContext),
      campaignContext: text(body.campaignContext, 60_000),
      locale: body.locale === 'en' ? 'en' : 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('director agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

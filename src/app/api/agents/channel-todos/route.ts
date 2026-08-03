import { NextResponse } from 'next/server';
import { runChannelTodos } from '@/lib/agents/specialist';
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
    const channelId = text(body.channelId, 80);
    const allowed = new Set(
      getChannelCatalog().map((channel) => channel.channelId)
    );
    if (!allowed.has(channelId)) {
      return NextResponse.json({ error: 'channelId required' }, { status: 400 });
    }
    const result = await runChannelTodos({
      channelId,
      channelStrategyMarkdown: text(body.channelStrategyMarkdown, 30_000),
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc: text(body.projectProfileDoc, 24_000),
      campaignContext: text(body.campaignContext, 60_000),
      targetMarkets: (Array.isArray(body.targetMarkets) ? body.targetMarkets : [])
        .slice(0, 12)
        .flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const market = item as Record<string, unknown>;
          const id = text(market.id, 160);
          const name = text(market.name, 300);
          const region = text(market.region, 300);
          const language = text(market.language, 160);
          const locale = text(market.locale, 40);
          if (!id || !name || !region || !language || !locale) return [];
          return [{ id, name, region, language, locale, audience: text(market.audience, 500) || undefined, isDefault: market.isDefault === true }];
        }),
      locale: body.locale === 'en' ? 'en' : 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('channel-todos agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

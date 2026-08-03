import { NextResponse } from 'next/server';
import { runTopicPlanner } from '@/lib/agents/topic-planner';
import { getChannelCatalog } from '@/lib/agents/catalog';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Parameters<typeof runTopicPlanner>[0];
    const allowedChannels = new Set(
      getChannelCatalog().map((channel) => channel.channelId)
    );
    const channelIds = [
      ...new Set(
        (Array.isArray(body.channelIds) ? body.channelIds : []).filter(
          (channelId): channelId is string =>
            typeof channelId === 'string' && allowedChannels.has(channelId)
        )
      ),
    ].slice(0, 16);
    if (channelIds.length === 0) {
      return NextResponse.json({ error: '没有可用的市场渠道。' }, { status: 400 });
    }
    return NextResponse.json(
      await runTopicPlanner({
        channelIds,
        count:
          typeof body.count === 'number' && Number.isFinite(body.count)
            ? Math.max(1, Math.min(14, Math.trunc(body.count)))
            : 7,
        brief:
          typeof body.brief === 'string'
            ? body.brief.trim().slice(0, 4_000)
            : undefined,
        userProfileDoc:
          typeof body.userProfileDoc === 'string'
            ? body.userProfileDoc.slice(0, 16_000)
            : '',
        projectProfileDoc:
          typeof body.projectProfileDoc === 'string'
            ? body.projectProfileDoc.slice(0, 24_000)
            : '',
        strategyMarkdown:
          typeof body.strategyMarkdown === 'string'
            ? body.strategyMarkdown.slice(0, 30_000)
            : '',
        channelStrategyMarkdown:
          body.channelStrategyMarkdown &&
          typeof body.channelStrategyMarkdown === 'object' &&
          !Array.isArray(body.channelStrategyMarkdown)
            ? body.channelStrategyMarkdown
            : {},
        performanceContext:
          typeof body.performanceContext === 'string'
            ? body.performanceContext.slice(0, 30_000)
            : '',
        campaignContext:
          typeof body.campaignContext === 'string'
            ? body.campaignContext.slice(0, 60_000)
            : '',
        locale: body.locale === 'en' ? 'en' : 'zh',
      })
    );
  } catch (error) {
    console.error('topic planner error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Topic planning failed' },
      { status: 500 }
    );
  }
}

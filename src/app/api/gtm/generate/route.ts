import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildGtmPlanFromChannels } from '@/lib/gtm/orchestrator';
import { buildStrategySummary } from '@/lib/agents/channel-router';
import { getChannelName } from '@/lib/agents/skills/registry';
import type { MemoryPayload } from '@/lib/gtm/memory';
import type { WeekTheme } from '@/lib/gtm/types';

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelIds, memory, directives } = body as {
      channelIds: string[];
      memory: MemoryPayload;
      directives?: string;
    };

    if (!channelIds?.length) {
      return NextResponse.json({ error: 'No channels selected' }, { status: 400 });
    }

    const { strategies, calendar } = await buildGtmPlanFromChannels(
      channelIds,
      memory,
      directives
    );

    const channelNames: Record<string, string> = {};
    for (const id of channelIds) {
      channelNames[id] = getChannelName(id);
    }

    // 合并各渠道的四周主线为整体叙事（取首个渠道的 weeklyArc 作为主线骨架）
    const weeklyArc: WeekTheme[] | undefined = Object.values(strategies).find(
      (s) => s.weeklyArc?.length
    )?.weeklyArc;

    const strategySummary = buildStrategySummary(memory, channelIds, channelNames, weeklyArc);

    return NextResponse.json({
      strategies,
      calendar,
      strategySummary,
      campaignStartDate: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

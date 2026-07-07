import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { runStrategyAgent } from '@/lib/agents/strategy-agent';
import type { MemoryPayload } from '@/lib/gtm/memory';
import type { ChatMessage, UnifiedDayPlan } from '@/lib/gtm/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memory, calendar, history, message } = body as {
      memory: MemoryPayload;
      calendar: UnifiedDayPlan[];
      history: ChatMessage[];
      message: string;
    };

    const result = await runStrategyAgent(memory, calendar, history, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Strategy chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Strategy chat failed' },
      { status: 500 }
    );
  }
}

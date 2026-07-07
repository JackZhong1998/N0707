import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { runContentAgent } from '@/lib/agents/execution';
import type { MemoryPayload } from '@/lib/gtm/memory';
import type { ChatMessage, DailyTask, Deliverable } from '@/lib/gtm/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task, deliverable, history, message, memory } = body as {
      task: DailyTask;
      deliverable: Deliverable;
      history: ChatMessage[];
      message: string;
      memory: MemoryPayload;
    };

    const result = await runContentAgent(task, deliverable, history, message, memory);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Content chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Content chat failed' },
      { status: 500 }
    );
  }
}

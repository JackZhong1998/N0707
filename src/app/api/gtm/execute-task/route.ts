import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { runTaskExecutor } from '@/lib/agents/execution';
import type { MemoryPayload } from '@/lib/gtm/memory';
import type { DailyTask, ChannelStrategy } from '@/lib/gtm/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task, strategy, memory } = body as {
      task: DailyTask;
      strategy?: ChannelStrategy;
      memory: MemoryPayload;
    };

    const deliverable = await runTaskExecutor(task, strategy, memory);
    return NextResponse.json({ deliverable });
  } catch (error) {
    console.error('Execute task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Task execution failed' },
      { status: 500 }
    );
  }
}

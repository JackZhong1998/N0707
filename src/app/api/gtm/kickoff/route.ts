import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { runKickoffChat } from '@/lib/agents/kickoff';
import type { MemoryPayload } from '@/lib/gtm/memory';
import type { ChatMessage } from '@/lib/gtm/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memory, history, message, roundCount } = body as {
      memory: MemoryPayload;
      history: ChatMessage[];
      message: string;
      roundCount: number;
    };

    const result = await runKickoffChat(memory, history, message, roundCount);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Kickoff error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kickoff failed' },
      { status: 500 }
    );
  }
}

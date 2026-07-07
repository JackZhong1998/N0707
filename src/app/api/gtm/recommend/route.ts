import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { runCmoRecommend } from '@/lib/agents/channel-router';
import type { MemoryPayload } from '@/lib/gtm/memory';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memory } = body as { memory: MemoryPayload };

    const recommendation = await runCmoRecommend(memory);
    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error('Recommend error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Recommend failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { runContextAgent, type ContextInput } from '@/lib/agents/context-agent';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as ContextInput;
    const result = await runContextAgent({
      recentMessages: body.recentMessages ?? [],
      userProfileDoc: body.userProfileDoc ?? '',
      projectProfileDoc: body.projectProfileDoc ?? '',
      locale: body.locale ?? 'zh',
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

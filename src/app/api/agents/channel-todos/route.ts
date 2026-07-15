import { NextResponse } from 'next/server';
import { runChannelTodos, type ChannelTodosInput } from '@/lib/agents/specialist';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as ChannelTodosInput;
    if (!body.channelId) {
      return NextResponse.json({ error: 'channelId required' }, { status: 400 });
    }
    const result = await runChannelTodos({
      channelId: body.channelId,
      channelStrategyMarkdown: body.channelStrategyMarkdown ?? '',
      userProfileDoc: body.userProfileDoc ?? '',
      projectProfileDoc: body.projectProfileDoc ?? '',
      locale: body.locale ?? 'zh',
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

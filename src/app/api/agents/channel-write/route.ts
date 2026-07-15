import { NextResponse } from 'next/server';
import { runChannelWrite, type ChannelWriteInput } from '@/lib/agents/specialist';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 180;

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as ChannelWriteInput;
    if (!body.todo?.channelId) {
      return NextResponse.json({ error: 'todo required' }, { status: 400 });
    }
    const result = await runChannelWrite({
      todo: body.todo,
      channelStrategyMarkdown: body.channelStrategyMarkdown ?? '',
      userProfileDoc: body.userProfileDoc ?? '',
      projectProfileDoc: body.projectProfileDoc ?? '',
      locale: body.locale ?? 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('channel-write agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

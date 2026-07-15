import { NextResponse } from 'next/server';
import { runChannelChat, type ChannelChatInput } from '@/lib/agents/specialist';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 180;

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as ChannelChatInput;
    if (!body.todo?.channelId || !body.message) {
      return NextResponse.json({ error: 'todo and message required' }, { status: 400 });
    }
    const result = await runChannelChat({
      todo: body.todo,
      currentContent: body.currentContent,
      history: body.history ?? [],
      message: body.message,
      channelStrategyMarkdown: body.channelStrategyMarkdown ?? '',
      channelTodosDigest: body.channelTodosDigest ?? '',
      userProfileDoc: body.userProfileDoc ?? '',
      projectProfileDoc: body.projectProfileDoc ?? '',
      locale: body.locale ?? 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('channel-chat agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

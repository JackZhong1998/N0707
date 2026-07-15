import { NextResponse } from 'next/server';
import { runDirector, type DirectorInput } from '@/lib/agents/director';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as DirectorInput;
    const result = await runDirector({
      message: body.message ?? '',
      history: body.history ?? [],
      userProfileDoc: body.userProfileDoc ?? '',
      projectProfileDoc: body.projectProfileDoc ?? '',
      hasStrategy: Boolean(body.hasStrategy),
      hasTodos: Boolean(body.hasTodos),
      channels: body.channels ?? [],
      todos: body.todos ?? [],
      locale: body.locale ?? 'zh',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('director agent error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { runWeeklyReflection } from '@/lib/agents/reflection';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 120;

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const body =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    return NextResponse.json(
      await runWeeklyReflection({
        userProfileDoc: text(body.userProfileDoc, 8_000),
        projectProfileDoc: text(body.projectProfileDoc, 24_000),
        strategyMarkdown: text(body.strategyMarkdown, 30_000),
        performanceContext: text(body.performanceContext, 30_000),
        campaignContext: text(body.campaignContext, 60_000),
        locale: body.locale === 'en' ? 'en' : 'zh',
      })
    );
  } catch (error) {
    console.error('reflection agent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reflection failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { runResearchQuery } from '@/lib/agents/general-work';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 180;

export async function POST(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 2_000) : '';
    if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });
    const maxSources = typeof body.maxSources === 'number' && Number.isFinite(body.maxSources)
      ? Math.max(3, Math.min(10, Math.round(body.maxSources)))
      : 8;
    return NextResponse.json(await runResearchQuery({
      query,
      title: typeof body.title === 'string' ? body.title.trim().slice(0, 300) : undefined,
      maxSources,
      userProfileDoc: typeof body.userProfileDoc === 'string' ? body.userProfileDoc.slice(0, 8_000) : '',
      projectProfileDoc: typeof body.projectProfileDoc === 'string' ? body.projectProfileDoc.slice(0, 24_000) : '',
      campaignContext: typeof body.campaignContext === 'string' ? body.campaignContext.slice(0, 60_000) : '',
      locale: body.locale === 'en' ? 'en' : 'zh',
    }));
  } catch (error) {
    console.error('research query error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Research failed' }, { status: 500 });
  }
}

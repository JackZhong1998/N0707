import { NextResponse } from 'next/server';
import { runArtifactWriter, type ArtifactType } from '@/lib/agents/general-work';
import { checkAuth } from '../_lib/auth';

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 8_000) : '';
    if (!instruction) return NextResponse.json({ error: 'instruction required' }, { status: 400 });
    const allowed = new Set<ArtifactType>(['report', 'email', 'script', 'post', 'document', 'other']);
    const artifactType = allowed.has(body.artifactType as ArtifactType)
      ? body.artifactType as ArtifactType
      : 'document';
    return NextResponse.json(await runArtifactWriter({
      instruction,
      title: typeof body.title === 'string' ? body.title.trim().slice(0, 300) : undefined,
      artifactType,
      userProfileDoc: typeof body.userProfileDoc === 'string' ? body.userProfileDoc.slice(0, 8_000) : '',
      projectProfileDoc: typeof body.projectProfileDoc === 'string' ? body.projectProfileDoc.slice(0, 24_000) : '',
      campaignContext: typeof body.campaignContext === 'string' ? body.campaignContext.slice(0, 60_000) : '',
      locale: body.locale === 'en' ? 'en' : 'zh',
    }));
  } catch (error) {
    console.error('artifact writer error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Writing failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { runProductResearch } from '@/lib/agents/researcher';
import { getSessionAccess } from '../_lib/auth';

export const maxDuration = 300;

const RESEARCH_WINDOW_MS = 60 * 60 * 1000;
const MAX_RESEARCH_RUNS_PER_WINDOW = 3;
const RESEARCH_CACHE_MS = 10 * 60 * 1000;
const researchRuns = new Map<string, number[]>();
const researchCache = new Map<
  string,
  {
    expiresAt: number;
    promise: ReturnType<typeof runProductResearch>;
  }
>();

function consumeResearchSlot(actor: string): boolean {
  const cutoff = Date.now() - RESEARCH_WINDOW_MS;
  const recent = (researchRuns.get(actor) ?? []).filter(
    (timestamp) => timestamp > cutoff
  );
  if (recent.length >= MAX_RESEARCH_RUNS_PER_WINDOW) return false;
  recent.push(Date.now());
  researchRuns.set(actor, recent);
  return true;
}

export async function POST(request: Request) {
  const access = await getSessionAccess();
  // Free signed-in users may run product research for Launch Brief.
  if (!access.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const body =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const websiteUrl =
      typeof body.websiteUrl === 'string'
        ? body.websiteUrl.trim().slice(0, 2_048)
        : '';
    const locale = body.locale === 'en' ? 'en' : 'zh';
    if (!websiteUrl) {
      return NextResponse.json({ error: '请提供产品官网地址。' }, { status: 400 });
    }
    const actor =
      access.userId ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'local-demo';
    const cacheKey = `${actor}:${websiteUrl.toLowerCase()}:${locale}`;
    const cached = researchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(await cached.promise);
    }
    if (!consumeResearchSlot(actor)) {
      return NextResponse.json(
        { error: '研究任务过于频繁，请稍后再试。' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const promise = runProductResearch({
      websiteUrl,
      locale,
    });
    researchCache.set(cacheKey, {
      expiresAt: Date.now() + RESEARCH_CACHE_MS,
      promise,
    });
    try {
      return NextResponse.json(await promise);
    } catch (error) {
      researchCache.delete(cacheKey);
      throw error;
    }
  } catch (error) {
    console.error('research agent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    );
  }
}

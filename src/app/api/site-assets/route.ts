import { NextResponse } from 'next/server';
import { collectPublicSiteAssets } from '@/lib/site-assets/collector';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { productUrl?: unknown };
    if (typeof body.productUrl !== 'string' || !body.productUrl.trim()) {
      return NextResponse.json({ error: 'Product URL is required' }, { status: 400 });
    }
    return NextResponse.json(await collectPublicSiteAssets(body.productUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Asset collection failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

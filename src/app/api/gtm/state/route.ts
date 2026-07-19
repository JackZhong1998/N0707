import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  GtmStateConflictError,
  isGtmStore,
  loadGtmStore,
  saveGtmStore,
} from '@/lib/gtm/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authenticatedUserId() {
  const { userId } = await auth();
  return userId;
}

export async function GET() {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await loadGtmStore(userId));
  } catch (error) {
    console.error('Failed to load GTM state:', error);
    return NextResponse.json(
      {
        error: 'Failed to load user data',
        ...(process.env.NODE_ENV !== 'production' && error instanceof Error
          ? { detail: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 4_000_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    const body = (await request.json()) as {
      store?: unknown;
      revision?: unknown;
    };
    if (!isGtmStore(body.store)) {
      return NextResponse.json({ error: 'Invalid GTM state' }, { status: 400 });
    }
    if (
      body.revision !== undefined &&
      (typeof body.revision !== 'string' ||
        body.revision.length > 64 ||
        (!/^\d{1,20}$/.test(body.revision) &&
          !Number.isFinite(Date.parse(body.revision))))
    ) {
      return NextResponse.json({ error: 'Invalid state revision' }, { status: 400 });
    }
    const revision = await saveGtmStore(
      userId,
      body.store,
      typeof body.revision === 'string' ? body.revision : undefined
    );
    return NextResponse.json({ saved: true, revision });
  } catch (error) {
    if (error instanceof GtmStateConflictError) {
      return NextResponse.json(
        { error: 'State changed in another session' },
        { status: 409 }
      );
    }
    console.error('Failed to save GTM state:', error);
    return NextResponse.json({ error: 'Failed to save user data' }, { status: 500 });
  }
}

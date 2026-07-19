import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = new Set(['active', 'trialing']);

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await getServiceSupabase()
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(
      { paid: PAID_STATUSES.has(data?.status ?? '') },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Failed to check subscription access:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription access' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/admin-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await getAdminAccess();
  return NextResponse.json(
    { admin: access.admin },
    {
      status: access.authenticated ? 200 : 401,
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
}

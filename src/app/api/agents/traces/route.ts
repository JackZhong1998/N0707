import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(200, Math.trunc(requestedLimit)))
    : 100;
  const agent = url.searchParams.get('agent')?.trim().slice(0, 120);

  let query = getServiceSupabase()
    .from('ai_usage_events')
    .select(
      'id,request_id,model,provider,prompt_tokens,completion_tokens,cached_tokens,cache_write_tokens,duration_ms,agent_name,operation,trace_id,session_id,prompt_hash,system_chars,user_chars,message_count,json_attempt,model_attempt,trace_metadata,provider_cost_usd,billed_cost_usd,created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (agent) query = query.eq('agent_name', agent);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ traces: data ?? [] });
}

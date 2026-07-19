import { auth } from '@clerk/nextjs/server';
import { getServiceSupabase } from '@/lib/supabase';

const PAID_STATUSES = new Set(['active', 'trialing']);

export interface AgentAccess {
  allowed: boolean;
  userId: string | null;
}

/**
 * Agent endpoints are paid product capabilities.
 *
 * Production fails closed when Clerk is missing. Anonymous access is retained
 * only for local development, or when an explicit demo flag is enabled.
 */
export async function getAgentAccess(): Promise<AgentAccess> {
  const configured =
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes('xxxxx');
  if (!configured) {
    return {
      allowed:
        process.env.NODE_ENV !== 'production' ||
        process.env.ALLOW_UNAUTHENTICATED_AGENT_DEMO === 'true',
      userId: null,
    };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { allowed: false, userId: null };
    const { data, error } = await getServiceSupabase()
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return {
      allowed: PAID_STATUSES.has(data?.status ?? ''),
      userId,
    };
  } catch {
    return { allowed: false, userId: null };
  }
}

export async function checkAuth(): Promise<boolean> {
  return (await getAgentAccess()).allowed;
}

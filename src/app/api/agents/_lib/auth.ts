import { auth } from '@clerk/nextjs/server';
import { getServiceSupabase } from '@/lib/supabase';

const PAID_STATUSES = new Set(['active', 'trialing']);

export interface AgentAccess {
  /** True when the caller may use paid Agent capabilities. */
  allowed: boolean;
  /** True when the caller is signed in (or local demo mode). */
  authenticated: boolean;
  /** True when the subscription is active/trialing. */
  paid: boolean;
  userId: string | null;
}

function demoAccess(): AgentAccess {
  const allowed =
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_UNAUTHENTICATED_AGENT_DEMO === 'true';
  return {
    allowed,
    authenticated: allowed,
    paid: allowed,
    userId: null,
  };
}

/**
 * Resolve signed-in + paid status for Agent endpoints.
 *
 * Production fails closed when Clerk is missing. Anonymous access is retained
 * only for local development, or when an explicit demo flag is enabled.
 */
export async function getSessionAccess(): Promise<AgentAccess> {
  const configured =
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes('xxxxx');
  if (!configured) return demoAccess();

  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        allowed: false,
        authenticated: false,
        paid: false,
        userId: null,
      };
    }
    const { data, error } = await getServiceSupabase()
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    const paid = PAID_STATUSES.has(data?.status ?? '');
    return {
      allowed: paid,
      authenticated: true,
      paid,
      userId,
    };
  } catch {
    return {
      allowed: false,
      authenticated: false,
      paid: false,
      userId: null,
    };
  }
}

/** Paid product capabilities (strategy, todos, channel write, etc.). */
export async function getAgentAccess(): Promise<AgentAccess> {
  return getSessionAccess();
}

export async function checkAuth(): Promise<boolean> {
  return (await getAgentAccess()).allowed;
}

/** Signed-in free tier: research, brief chat, brief patch. */
export async function checkSignedIn(): Promise<boolean> {
  return (await getSessionAccess()).authenticated;
}

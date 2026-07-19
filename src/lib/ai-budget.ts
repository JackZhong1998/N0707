import { auth } from '@clerk/nextjs/server';
import { getServiceSupabase } from '@/lib/supabase';

const DEFAULT_SOFT_LIMIT_USD = 6;
const DEFAULT_HARD_LIMIT_USD = 8;
const DEFAULT_CREDIT_FEE_RATE = 0.055;

export interface AiBudget {
  userId: string | null;
  monthStart: string;
  spentUsd: number;
  softLimitUsd: number;
  hardLimitUsd: number;
  shouldDowngrade: boolean;
  isBlocked: boolean;
}

export interface AiUsageEvent {
  requestId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  providerCostUsd: number;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function currentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function currentUserId(): Promise<string | null> {
  const clerkConfigured =
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes('xxxxx');
  if (!clerkConfigured) return null;

  try {
    return (await auth()).userId;
  } catch {
    return null;
  }
}

function budgetSettings() {
  const softLimitUsd = positiveNumber(
    process.env.AI_MONTHLY_SOFT_LIMIT_USD,
    DEFAULT_SOFT_LIMIT_USD
  );
  const hardLimitUsd = Math.max(
    softLimitUsd,
    positiveNumber(process.env.AI_MONTHLY_HARD_LIMIT_USD, DEFAULT_HARD_LIMIT_USD)
  );
  return { softLimitUsd, hardLimitUsd };
}

export async function getAiBudget(): Promise<AiBudget> {
  const userId = await currentUserId();
  const monthStart = currentMonthStart();
  const { softLimitUsd, hardLimitUsd } = budgetSettings();

  // Local/demo environments do not have a stable billable user.
  if (!userId) {
    return {
      userId,
      monthStart,
      spentUsd: 0,
      softLimitUsd,
      hardLimitUsd,
      shouldDowngrade: false,
      isBlocked: false,
    };
  }

  const { data, error } = await getServiceSupabase().rpc('get_ai_monthly_spend', {
    p_user_id: userId,
    p_month_start: monthStart,
  });
  if (error) throw new Error(`Failed to check AI budget: ${error.message}`);

  const spentUsd = Number(data ?? 0);
  return {
    userId,
    monthStart,
    spentUsd,
    softLimitUsd,
    hardLimitUsd,
    shouldDowngrade: spentUsd >= softLimitUsd,
    isBlocked: spentUsd >= hardLimitUsd,
  };
}

export async function recordAiUsage(
  budget: AiBudget,
  usage: AiUsageEvent
): Promise<void> {
  if (!budget.userId) return;

  const feeRate = positiveNumber(
    process.env.OPENROUTER_CREDIT_FEE_RATE,
    DEFAULT_CREDIT_FEE_RATE
  );
  const providerCostUsd = Math.max(0, usage.providerCostUsd);
  const billedCostUsd = providerCostUsd * (1 + feeRate);

  const { error } = await getServiceSupabase().from('ai_usage_events').insert({
    user_id: budget.userId,
    request_id: usage.requestId || null,
    model: usage.model,
    prompt_tokens: Math.max(0, Math.trunc(usage.promptTokens)),
    completion_tokens: Math.max(0, Math.trunc(usage.completionTokens)),
    provider_cost_usd: providerCostUsd,
    billed_cost_usd: billedCostUsd,
  });
  if (error) {
    // The user already received the model output, so accounting failure should
    // be observable without turning a successful generation into a 500.
    console.error('Failed to record AI usage:', error.message);
  }
}

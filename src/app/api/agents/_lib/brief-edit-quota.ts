/** Free Launch Brief AI write-backs before paywall. */
export const FREE_BRIEF_EDIT_LIMIT = 20;

const briefEditCounts = new Map<string, number>();
const consumedTokens = new Map<string, number>();

export function getBriefEditUsed(userId: string): number {
  return briefEditCounts.get(userId) ?? 0;
}

export function remainingBriefEdits(userId: string): number {
  return Math.max(0, FREE_BRIEF_EDIT_LIMIT - getBriefEditUsed(userId));
}

/** Increment at most once per editToken (covers conflict-retry double calls). */
export function recordBriefEditSuccess(
  userId: string,
  editToken?: string
): {
  used: number;
  remaining: number;
} {
  if (editToken) {
    const key = `${userId}:${editToken}`;
    const existing = consumedTokens.get(key);
    if (typeof existing === 'number') {
      return {
        used: existing,
        remaining: Math.max(0, FREE_BRIEF_EDIT_LIMIT - existing),
      };
    }
  }
  const used = getBriefEditUsed(userId) + 1;
  briefEditCounts.set(userId, used);
  if (editToken) {
    consumedTokens.set(`${userId}:${editToken}`, used);
    // Bound memory for long-lived serverless isolates.
    if (consumedTokens.size > 5_000) {
      const first = consumedTokens.keys().next().value;
      if (first) consumedTokens.delete(first);
    }
  }
  return {
    used,
    remaining: Math.max(0, FREE_BRIEF_EDIT_LIMIT - used),
  };
}

export function canUseFreeBriefEdit(userId: string): boolean {
  return getBriefEditUsed(userId) < FREE_BRIEF_EDIT_LIMIT;
}

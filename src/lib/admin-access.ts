import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';

function allowlist(name: 'ADMIN_EMAILS' | 'ADMIN_CLERK_USER_IDS'): Set<string> {
  return new Set(
    (process.env[name] ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export type AdminAccess = {
  authenticated: boolean;
  admin: boolean;
  userId: string | null;
};

/** Admin access fails closed when no allowlist entry matches. */
export async function getAdminAccess(): Promise<AdminAccess> {
  const { userId } = await auth();
  if (!userId) return { authenticated: false, admin: false, userId: null };

  if (allowlist('ADMIN_CLERK_USER_IDS').has(userId.toLowerCase())) {
    return { authenticated: true, admin: true, userId };
  }

  const allowedEmails = allowlist('ADMIN_EMAILS');
  if (allowedEmails.size === 0) {
    return { authenticated: true, admin: false, userId };
  }

  const user = await currentUser();
  const admin = Boolean(
    user?.emailAddresses.some(
      (entry) =>
        entry.verification?.status === 'verified' &&
        allowedEmails.has(entry.emailAddress.trim().toLowerCase())
    )
  );
  return { authenticated: true, admin, userId };
}

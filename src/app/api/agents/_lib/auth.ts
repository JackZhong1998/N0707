import { auth } from '@clerk/nextjs/server';

/** Clerk 已配置时校验登录；未配置（本地演示）时放行 */
export async function checkAuth(): Promise<boolean> {
  const configured =
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes('xxxxx');
  if (!configured) return true;
  try {
    const { userId } = await auth();
    return Boolean(userId);
  } catch {
    return true;
  }
}

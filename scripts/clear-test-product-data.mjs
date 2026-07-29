// Clear product-generated data from the Supabase test environment while
// preserving identities, Stripe subscription state, and webhook idempotency.
//
// Preview every test user:
//   node scripts/clear-test-product-data.mjs --all
//
// Clear every test user after reviewing the preview:
//   node scripts/clear-test-product-data.mjs --all --confirm
//
// Clear one Clerk test user:
//   node scripts/clear-test-product-data.mjs user_xxx --confirm

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnvFile(path) {
  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const args = new Set(process.argv.slice(2));
const clearAll = args.has('--all');
const confirmed = args.has('--confirm');
const requestedUserIds = process.argv
  .slice(2)
  .filter((arg) => arg.startsWith('user_'));

if ((!clearAll && requestedUserIds.length === 0) || (clearAll && requestedUserIds.length > 0)) {
  console.error(
    'Usage: node scripts/clear-test-product-data.mjs (--all | user_xxx [user_yyy]) [--confirm]'
  );
  process.exit(1);
}

const env = readEnvFile('.env.local');
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const clerkKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const stripeKey = env.STRIPE_SECRET_KEY || '';

if (!supabaseUrl || !adminKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase admin key in .env.local');
  process.exit(1);
}

// Refuse to run against live Clerk/Stripe credentials. This script is only for
// the test stack even when --confirm is supplied.
if (!clerkKey.startsWith('pk_test_') || !stripeKey.startsWith('sk_test_')) {
  console.error('Refusing to clear data: Clerk and Stripe must both be in test mode.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let usersQuery = admin
  .from('app_users')
  .select('id, clerk_user_id, email, display_name, created_at')
  .order('created_at');
if (!clearAll) usersQuery = usersQuery.in('clerk_user_id', requestedUserIds);

const usersRead = await usersQuery;
if (usersRead.error) throw new Error(`read app_users: ${usersRead.error.message}`);

const users = usersRead.data || [];
if (users.length === 0) {
  console.log('No matching test users found. Nothing to clear.');
  process.exit(0);
}

console.log(`Supabase project: ${new URL(supabaseUrl).hostname}`);
console.log(`Test users selected: ${users.length}`);

for (const user of users) {
  const projectsRead = await admin
    .from('gtm_projects')
    .select('id, name, slug')
    .eq('owner_id', user.id);
  if (projectsRead.error) throw new Error(`read gtm_projects: ${projectsRead.error.message}`);

  const usageRead = await admin
    .from('ai_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.clerk_user_id);
  if (usageRead.error) throw new Error(`read ai_usage_events: ${usageRead.error.message}`);

  console.log(
    `- ${user.display_name || user.email || user.clerk_user_id} (${user.clerk_user_id}): ` +
      `${projectsRead.data.length} project(s), ${usageRead.count || 0} AI usage event(s)`
  );
}

console.log('Preserved: app_users, subscriptions, stripe_events.');

if (!confirmed) {
  console.log('Preview only. Re-run with --confirm to perform the deletion.');
  process.exit(0);
}

const ownerIds = users.map((user) => user.id);
const clerkUserIds = users.map((user) => user.clerk_user_id);

// Project deletion cascades through contexts, conversations, messages,
// strategies, channels, topics, variants, todos, and their related rows.
const projectsDelete = await admin.from('gtm_projects').delete().in('owner_id', ownerIds);
if (projectsDelete.error) {
  throw new Error(`delete gtm_projects: ${projectsDelete.error.message}`);
}

const usageDelete = await admin.from('ai_usage_events').delete().in('user_id', clerkUserIds);
if (usageDelete.error) {
  throw new Error(`delete ai_usage_events: ${usageDelete.error.message}`);
}

const [projectsCheck, usageCheck, usersCheck, subscriptionsCheck] = await Promise.all([
  admin.from('gtm_projects').select('id').in('owner_id', ownerIds),
  admin.from('ai_usage_events').select('id').in('user_id', clerkUserIds),
  admin.from('app_users').select('id').in('id', ownerIds),
  admin.from('subscriptions').select('id').in('user_id', clerkUserIds),
]);

const failedResponse = [projectsCheck, usageCheck, usersCheck, subscriptionsCheck].find(
  (response) => response.error
);
if (failedResponse) throw new Error(`verify cleanup: ${failedResponse.error.message}`);

if (projectsCheck.data.length !== 0 || usageCheck.data.length !== 0) {
  console.error('Verification failed: product data still remains.');
  process.exit(1);
}
if (usersCheck.data.length !== users.length) {
  console.error('Verification failed: one or more app_users rows were unexpectedly removed.');
  process.exit(1);
}

console.log(
  `Done. Cleared product data for ${users.length} test user(s); ` +
    `preserved ${usersCheck.data.length} identity row(s) and ` +
    `${subscriptionsCheck.data.length} subscription row(s).`
);

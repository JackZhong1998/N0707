// Reset a test user: delete all Supabase data owned by the given Clerk user ID
// so the account behaves like a brand-new user on next login.
//
// Usage: node scripts/reset-test-user.mjs <clerk_user_id>

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

const clerkUserId = process.argv[2];
if (!clerkUserId || !clerkUserId.startsWith('user_')) {
  console.error('Usage: node scripts/reset-test-user.mjs <clerk_user_id>');
  process.exit(1);
}

const env = readEnvFile('.env.local');
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !adminKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const userRead = await admin
  .from('app_users')
  .select('id, clerk_user_id, email, display_name')
  .eq('clerk_user_id', clerkUserId)
  .maybeSingle();
if (userRead.error) throw new Error(`read app_users: ${userRead.error.message}`);

if (!userRead.data) {
  console.log(`No app_users row found for ${clerkUserId}.`);
} else {
  console.log('Found user:', userRead.data);
  const projects = await admin
    .from('gtm_projects')
    .select('id, name, slug')
    .eq('owner_id', userRead.data.id);
  if (projects.error) throw new Error(`read gtm_projects: ${projects.error.message}`);
  console.log(`Projects to cascade-delete: ${projects.data.length}`);
  for (const project of projects.data) console.log(`  - ${project.name} (${project.slug})`);

  // Deleting app_users cascades to gtm_projects and everything beneath it
  // (contexts, conversations, messages, strategies, topics, variants, todos).
  const userDelete = await admin.from('app_users').delete().eq('clerk_user_id', clerkUserId);
  if (userDelete.error) throw new Error(`delete app_users: ${userDelete.error.message}`);
  console.log('Deleted app_users row (cascaded to all project data).');
}

// These tables key on Clerk's text ID and are not covered by the cascade.
const subDelete = await admin.from('subscriptions').delete().eq('user_id', clerkUserId);
if (subDelete.error) throw new Error(`delete subscriptions: ${subDelete.error.message}`);
console.log('Deleted subscriptions rows.');

const usageDelete = await admin.from('ai_usage_events').delete().eq('user_id', clerkUserId);
if (usageDelete.error) throw new Error(`delete ai_usage_events: ${usageDelete.error.message}`);
console.log('Deleted ai_usage_events rows.');

// Verify everything is gone.
const [userCheck, projectCheck, subCheck, usageCheck] = await Promise.all([
  admin.from('app_users').select('id').eq('clerk_user_id', clerkUserId),
  userRead.data
    ? admin.from('gtm_projects').select('id').eq('owner_id', userRead.data.id)
    : Promise.resolve({ error: null, data: [] }),
  admin.from('subscriptions').select('id').eq('user_id', clerkUserId),
  admin.from('ai_usage_events').select('id').eq('user_id', clerkUserId),
]);
const clean = [userCheck, projectCheck, subCheck, usageCheck].every(
  (response) => !response.error && response.data.length === 0
);
if (!clean) {
  console.error('Verification failed: some rows still remain.');
  process.exit(1);
}
console.log(`Done. ${clerkUserId} is now a fresh user.`);

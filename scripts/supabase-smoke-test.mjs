import crypto from 'node:crypto';
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

function assertNoError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = readEnvFile('.env.local');
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

assert(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL is missing');
assert(adminKey, 'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing');
assert(anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(supabaseUrl, adminKey, options);
const anonymous = createClient(supabaseUrl, anonKey, options);

const runId = crypto.randomUUID();
const clerkUserId = `codex_smoke_${runId}`;
const messageId = `message_${runId}`;
const todoId = `todo_${runId}`;
const stripeEventId = `evt_codex_smoke_${runId}`;
const aiRequestId = `req_codex_smoke_${runId}`;
let appUserId;
let projectId;
let conversationId;

const result = {
  connection: false,
  normalizedWriteRead: false,
  marketReportSingleWrite: false,
  updateTriggers: false,
  aiSpendRpc: false,
  anonymousIsolation: false,
  cleanup: false,
};

try {
  const userInsert = await admin
    .from('app_users')
    .insert({
      clerk_user_id: clerkUserId,
      email: `${runId}@example.invalid`,
      display_name: 'Codex smoke test',
    })
    .select('id')
    .single();
  assertNoError('insert app user', userInsert.error);
  appUserId = userInsert.data.id;
  result.connection = true;

  const projectInsert = await admin
    .from('gtm_projects')
    .insert({
      owner_id: appUserId,
      slug: 'default',
      name: 'Smoke Test Project',
      plan_ready: true,
      start_date: '2026-07-18',
    })
    .select('id, updated_at')
    .single();
  assertNoError('insert project', projectInsert.error);
  projectId = projectInsert.data.id;
  const originalProjectUpdatedAt = projectInsert.data.updated_at;

  const contextInsert = await admin.from('project_contexts').insert({
    project_id: projectId,
    user_profile_doc: '# User profile',
    project_profile_doc: '# Project profile',
    messages_since_sync: 2,
  });
  assertNoError('insert context', contextInsert.error);

  const conversationInsert = await admin
    .from('conversations')
    .insert({
      project_id: projectId,
      kind: 'director',
      topic_key: 'director',
      title: 'Marketing Director',
    })
    .select('id')
    .single();
  assertNoError('insert conversation', conversationInsert.error);
  conversationId = conversationInsert.data.id;

  const messageInsert = await admin.from('messages').insert({
    id: messageId,
    conversation_id: conversationId,
    role: 'user',
    content: 'Smoke test message',
    created_at: new Date().toISOString(),
  });
  assertNoError('insert message', messageInsert.error);

  const strategyInsert = await admin.from('market_strategies').insert({
    project_id: projectId,
    overview_markdown: '# Strategy',
    goal: 'Validate persistence',
  });
  assertNoError('insert market strategy', strategyInsert.error);

  const marketReport = {
    reportMarkdown: '# Complete report\n\nAll sections uploaded together.',
    summaryMarkdown: 'Smoke test report',
    diagnosis: {
      productType: 'b2b_saas',
      growthStage: 'cold-start',
      primaryMarket: 'global',
      bottleneck: 'distribution',
    },
    recommendations: [],
    launchPlan: [],
    directoryPlan: { strategy: 'Batch submissions', priorityCriteria: [], schedule: [] },
    specialistSkillsUsed: [],
    updatedAt: Date.now(),
  };
  const reportInsert = await admin.from('market_strategy_reports').insert({
    project_id: projectId,
    launch_id: `launch-${runId}`,
    locale: 'en',
    product_name: 'Smoke Product',
    report_markdown: marketReport.reportMarkdown,
    report: marketReport,
  });
  assertNoError('insert complete market strategy report', reportInsert.error);
  const duplicateReport = await admin.from('market_strategy_reports').insert({
    project_id: projectId,
    launch_id: `launch-${runId}`,
    locale: 'en',
    product_name: 'Duplicate',
    report_markdown: '# Duplicate',
    report: { ...marketReport, reportMarkdown: '# Duplicate' },
  });
  assert(
    duplicateReport.error?.code === '23505',
    'market strategy report accepted a duplicate launch upload'
  );
  const reportRead = await admin
    .from('market_strategy_reports')
    .select('report_markdown, report')
    .eq('project_id', projectId)
    .eq('launch_id', `launch-${runId}`)
    .single();
  assertNoError('read complete market strategy report', reportRead.error);
  assert(
    reportRead.data.report_markdown === marketReport.reportMarkdown &&
      reportRead.data.report?.reportMarkdown === marketReport.reportMarkdown,
    'market strategy report was not stored as one complete payload'
  );
  result.marketReportSingleWrite = true;

  const channelStrategyInsert = await admin.from('channel_strategies').insert({
    project_id: projectId,
    channel_id: 'smoke_channel',
    channel_name: 'Smoke Channel',
    positioning: 'Test positioning',
    direction: 'Test direction',
    content_pillars: ['proof', 'education'],
    markdown: '# Channel strategy',
  });
  assertNoError('insert channel strategy', channelStrategyInsert.error);

  const projectChannelInsert = await admin.from('project_channels').insert({
    project_id: projectId,
    channel_id: 'smoke_channel',
  });
  assertNoError('insert project channel', projectChannelInsert.error);

  const todoInsert = await admin.from('todos').insert({
    id: todoId,
    project_id: projectId,
    channel_id: 'smoke_channel',
    channel_name: 'Smoke Channel',
    day_index: 1,
    due_date: '2026-07-18',
    title: 'Smoke test todo',
    brief: 'Validate todo persistence',
    status: 'pending',
    content_status: 'none',
    publish_status: 'not_started',
  });
  assertNoError('insert todo', todoInsert.error);

  const subscriptionInsert = await admin.from('subscriptions').insert({
    user_id: clerkUserId,
    plan: 'pro',
    billing_cycle: 'month',
    status: 'active',
  });
  assertNoError('insert subscription', subscriptionInsert.error);

  const stripeEventInsert = await admin.from('stripe_events').insert({
    id: stripeEventId,
    type: 'codex.smoke_test',
    livemode: false,
    status: 'processed',
    stripe_created_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
  });
  assertNoError('insert stripe event', stripeEventInsert.error);

  const aiUsageInsert = await admin.from('ai_usage_events').insert({
    user_id: clerkUserId,
    request_id: aiRequestId,
    model: 'smoke-test-model',
    prompt_tokens: 10,
    completion_tokens: 5,
    provider_cost_usd: 0.01,
    billed_cost_usd: 0.012,
  });
  assertNoError('insert AI usage event', aiUsageInsert.error);

  const todoUpdate = await admin
    .from('todos')
    .update({
      status: 'done',
      content_title: 'Smoke output',
      content_body: 'Persisted body',
      content_status: 'ready',
      publish_status: 'published',
      published_url: 'https://example.invalid/smoke',
      published_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('id', todoId)
    .select('status, content_status, publish_status, updated_at')
    .single();
  assertNoError('update todo', todoUpdate.error);

  const projectUpdate = await admin
    .from('gtm_projects')
    .update({ name: 'Updated Smoke Test Project' })
    .eq('id', projectId)
    .select('updated_at')
    .single();
  assertNoError('update project', projectUpdate.error);
  assert(
    Date.parse(projectUpdate.data.updated_at) >= Date.parse(originalProjectUpdatedAt),
    'updated_at trigger did not run'
  );
  result.updateTriggers = true;

  const [contextRead, messagesRead, strategyRead, channelRead, todoRead, subscriptionRead] =
    await Promise.all([
      admin.from('project_contexts').select('user_profile_doc').eq('project_id', projectId).single(),
      admin.from('messages').select('content').eq('conversation_id', conversationId),
      admin.from('market_strategies').select('goal').eq('project_id', projectId).single(),
      admin.from('channel_strategies').select('channel_id').eq('project_id', projectId),
      admin.from('todos').select('status, publish_status').eq('project_id', projectId).single(),
      admin.from('subscriptions').select('status').eq('user_id', clerkUserId).single(),
    ]);
  for (const [label, response] of [
    ['read context', contextRead],
    ['read messages', messagesRead],
    ['read strategy', strategyRead],
    ['read channels', channelRead],
    ['read todo', todoRead],
    ['read subscription', subscriptionRead],
  ]) {
    assertNoError(label, response.error);
  }
  assert(contextRead.data.user_profile_doc === '# User profile', 'context read mismatch');
  assert(messagesRead.data.length === 1, 'message read mismatch');
  assert(strategyRead.data.goal === 'Validate persistence', 'strategy read mismatch');
  assert(channelRead.data.length === 1, 'channel strategy read mismatch');
  assert(todoRead.data.status === 'done', 'todo update mismatch');
  assert(todoRead.data.publish_status === 'published', 'publish status mismatch');
  assert(subscriptionRead.data.status === 'active', 'subscription read mismatch');
  result.normalizedWriteRead = true;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const spendRead = await admin.rpc('get_ai_monthly_spend', {
    p_user_id: clerkUserId,
    p_month_start: monthStart.toISOString(),
  });
  assertNoError('read AI monthly spend', spendRead.error);
  assert(Number(spendRead.data) === 0.012, 'AI monthly spend mismatch');
  result.aiSpendRpc = true;

  const anonymousRead = await anonymous
    .from('app_users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
  assert(!anonymousRead.data, 'anonymous key could read protected user data');
  const anonymousSpend = await anonymous.rpc('get_ai_monthly_spend', {
    p_user_id: clerkUserId,
    p_month_start: monthStart.toISOString(),
  });
  assert(!anonymousSpend.data, 'anonymous key could execute protected spend RPC');
  result.anonymousIsolation = true;
} finally {
  await admin.from('stripe_events').delete().eq('id', stripeEventId);
  await admin.from('ai_usage_events').delete().eq('request_id', aiRequestId);
  await admin.from('subscriptions').delete().eq('user_id', clerkUserId);
  if (appUserId) await admin.from('app_users').delete().eq('id', appUserId);

  const [userCheck, subscriptionCheck, stripeCheck, usageCheck] = await Promise.all([
    admin.from('app_users').select('id').eq('clerk_user_id', clerkUserId),
    admin.from('subscriptions').select('id').eq('user_id', clerkUserId),
    admin.from('stripe_events').select('id').eq('id', stripeEventId),
    admin.from('ai_usage_events').select('id').eq('request_id', aiRequestId),
  ]);
  result.cleanup = [userCheck, subscriptionCheck, stripeCheck, usageCheck].every(
    (response) => !response.error && response.data.length === 0
  );
}

console.log(JSON.stringify(result, null, 2));
assert(Object.values(result).every(Boolean), 'One or more Supabase smoke checks failed');

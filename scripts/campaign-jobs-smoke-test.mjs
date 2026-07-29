import crypto from 'node:crypto';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  throw new Error('Supabase environment variables are incomplete');
}

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(url, serviceKey, options);
const anonymous = createClient(url, anonKey, options);
const suffix = crypto.randomUUID();
const clerkUserId = `campaign_smoke_${suffix}`;
const buildKey = `campaign:smoke:${suffix}`;
let appUserId;
let projectId;

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

function noError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

const result = {
  canonicalSnapshot: false,
  idempotentEnqueue: false,
  deterministicSteps: false,
  exclusiveClaim: false,
  stepCheckpoint: false,
  retryRelease: false,
  anonymousIsolation: false,
  cleanup: false,
};

try {
  const user = await admin
    .from('app_users')
    .insert({ clerk_user_id: clerkUserId })
    .select('id')
    .single();
  noError('create smoke user', user.error);
  appUserId = user.data.id;

  const project = await admin
    .from('gtm_projects')
    .insert({
      owner_id: appUserId,
      slug: 'default',
      name: 'Campaign queue smoke test',
      state_snapshot: { version: 5, smoke: true },
    })
    .select('id,state_revision,state_snapshot')
    .single();
  noError('create smoke project', project.error);
  projectId = project.data.id;
  ok(project.data.state_revision === 0, 'state revision default is not zero');
  ok(project.data.state_snapshot?.smoke === true, 'state snapshot did not persist');
  result.canonicalSnapshot = true;

  const enqueueArgs = {
    p_project_id: projectId,
    p_clerk_user_id: clerkUserId,
    p_build_key: buildKey,
    p_locale: 'en',
    p_input_snapshot: { version: 5, smoke: true },
    p_channel_ids: ['x', 'linkedin'],
  };
  const first = await admin.rpc('enqueue_campaign_job', enqueueArgs);
  noError('enqueue smoke job', first.error);
  const second = await admin.rpc('enqueue_campaign_job', enqueueArgs);
  noError('re-enqueue smoke job', second.error);
  ok(first.data === second.data, 'idempotent enqueue returned a different job');
  result.idempotentEnqueue = true;

  const steps = await admin
    .from('campaign_job_steps')
    .select('step_key,status,sort_order')
    .eq('job_id', first.data)
    .order('sort_order');
  noError('load smoke steps', steps.error);
  ok(steps.data.length === 6, `expected 6 steps, got ${steps.data.length}`);
  ok(steps.data[0].step_key === 'blueprint', 'blueprint is not the first step');
  ok(steps.data[5].step_key === 'finalize', 'finalize is not the last step');
  result.deterministicSteps = true;

  const otherActiveJobs = await admin
    .from('campaign_jobs')
    .select('id', { count: 'exact', head: true })
    .neq('id', first.data)
    .in('status', ['queued', 'running']);
  noError('check active Campaign jobs', otherActiveJobs.error);
  ok(
    otherActiveJobs.count === 0,
    'another Campaign is active; rerun this smoke test when the queue is idle'
  );

  const claim = await admin.rpc('claim_campaign_job', {
    p_worker_id: `worker-a-${suffix}`,
    p_lease_seconds: 120,
  });
  noError('claim smoke job', claim.error);
  ok(claim.data?.[0]?.id === first.data, 'worker A did not claim smoke job');
  const competingClaim = await admin.rpc('claim_campaign_job', {
    p_worker_id: `worker-b-${suffix}`,
    p_lease_seconds: 120,
  });
  noError('competing claim', competingClaim.error);
  ok(competingClaim.data.length === 0, 'two workers claimed the same job');
  result.exclusiveClaim = true;

  const stepClaim = await admin.rpc('claim_campaign_job_step', {
    p_job_id: first.data,
    p_worker_id: `worker-a-${suffix}`,
    p_lease_seconds: 120,
  });
  noError('claim blueprint step', stepClaim.error);
  ok(stepClaim.data?.[0]?.step_key === 'blueprint', 'wrong first step claimed');
  const stepId = stepClaim.data[0].id;
  const complete = await admin.rpc('complete_campaign_job_step', {
    p_step_id: stepId,
    p_worker_id: `worker-a-${suffix}`,
    p_result_snapshot: { checkpoint: 'blueprint' },
  });
  noError('complete blueprint step', complete.error);
  ok(complete.data === true, 'blueprint checkpoint was not accepted');
  result.stepCheckpoint = true;

  const release = await admin.rpc('release_campaign_job', {
    p_job_id: first.data,
    p_worker_id: `worker-a-${suffix}`,
  });
  noError('release smoke job', release.error);
  ok(release.data === true, 'job was not released after checkpoint');

  const retryClaim = await admin.rpc('claim_campaign_job', {
    p_worker_id: `worker-b-${suffix}`,
    p_lease_seconds: 120,
  });
  noError('reclaim smoke job', retryClaim.error);
  const nextStep = await admin.rpc('claim_campaign_job_step', {
    p_job_id: first.data,
    p_worker_id: `worker-b-${suffix}`,
    p_lease_seconds: 120,
  });
  noError('claim next smoke step', nextStep.error);
  ok(
    nextStep.data?.[0]?.step_key === 'channel_strategy:x',
    'resume did not continue from the first unfinished step'
  );
  const failed = await admin.rpc('fail_campaign_job_step', {
    p_step_id: nextStep.data[0].id,
    p_worker_id: `worker-b-${suffix}`,
    p_error: 'intentional smoke retry',
    p_retry_delay_seconds: 1,
  });
  noError('record smoke retry', failed.error);
  ok(failed.data === 'queued', 'retryable step was not returned to queue');
  result.retryRelease = true;

  const anonymousRead = await anonymous
    .from('campaign_jobs')
    .select('id')
    .eq('id', first.data);
  ok(
    Boolean(anonymousRead.error) || anonymousRead.data.length === 0,
    'anonymous client could read Campaign jobs'
  );
  result.anonymousIsolation = true;
} finally {
  if (appUserId) {
    const cleanup = await admin.from('app_users').delete().eq('id', appUserId);
    noError('cleanup smoke user', cleanup.error);
    result.cleanup = true;
  }
}

console.log(JSON.stringify(result, null, 2));

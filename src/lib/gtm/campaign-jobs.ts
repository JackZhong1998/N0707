import 'server-only';

import { getServiceSupabase } from '@/lib/supabase';
import { ensureDefaultProject } from './database';
import type { GtmStore } from './types';

export type CampaignJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type CampaignStepType =
  | 'blueprint'
  | 'channel_strategy'
  | 'channel_calendar'
  | 'finalize';

export type CampaignStepStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface CampaignJobRecord {
  id: string;
  project_id: string;
  clerk_user_id: string;
  build_key: string;
  locale: 'en' | 'zh';
  status: CampaignJobStatus;
  current_step: string | null;
  progress_completed: number;
  progress_total: number;
  attempt_count: number;
  max_attempts: number;
  priority: number;
  input_snapshot: GtmStore;
  result_summary: Record<string, unknown> | null;
  last_error: string | null;
  locked_by: string | null;
  locked_at: string | null;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
  next_attempt_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignJobStepRecord {
  id: string;
  job_id: string;
  step_key: string;
  step_type: CampaignStepType;
  channel_id: string | null;
  sort_order: number;
  status: CampaignStepStatus;
  attempt_count: number;
  max_attempts: number;
  input_snapshot: Record<string, unknown>;
  result_snapshot: unknown;
  last_error: string | null;
  locked_by: string | null;
  locked_at: string | null;
  lease_expires_at: string | null;
  next_attempt_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function throwDatabaseError(label: string, error: { message: string } | null) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function enqueueCampaignJob(input: {
  clerkUserId: string;
  buildKey: string;
  locale: string;
  store: GtmStore;
  channelIds: string[];
}): Promise<CampaignJobRecord> {
  const { project } = await ensureDefaultProject(input.clerkUserId);
  const supabase = getServiceSupabase();
  const { data: jobId, error: enqueueError } = await supabase.rpc(
    'enqueue_campaign_job',
    {
      p_project_id: project.id,
      p_clerk_user_id: input.clerkUserId,
      p_build_key: input.buildKey,
      p_locale: input.locale === 'zh' ? 'zh' : 'en',
      p_input_snapshot: input.store,
      p_channel_ids: input.channelIds,
    }
  );
  throwDatabaseError('Failed to enqueue Campaign job', enqueueError);
  if (typeof jobId !== 'string') {
    throw new Error('Failed to enqueue Campaign job: no job id returned');
  }
  const job = await getCampaignJob(input.clerkUserId, jobId);
  if (!job) throw new Error('Campaign job was not found after enqueue');
  return job;
}

export async function getCampaignJob(
  clerkUserId: string,
  jobId: string
): Promise<CampaignJobRecord | null> {
  const { project } = await ensureDefaultProject(clerkUserId);
  const { data, error } = await getServiceSupabase()
    .from('campaign_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('project_id', project.id)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
  throwDatabaseError('Failed to load Campaign job', error);
  return (data as CampaignJobRecord | null) ?? null;
}

export async function getLatestCampaignJob(
  clerkUserId: string
): Promise<CampaignJobRecord | null> {
  const { project } = await ensureDefaultProject(clerkUserId);
  const { data, error } = await getServiceSupabase()
    .from('campaign_jobs')
    .select('*')
    .eq('project_id', project.id)
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwDatabaseError('Failed to load latest Campaign job', error);
  return (data as CampaignJobRecord | null) ?? null;
}

export async function listCampaignJobSteps(
  clerkUserId: string,
  jobId: string
): Promise<CampaignJobStepRecord[]> {
  const job = await getCampaignJob(clerkUserId, jobId);
  if (!job) return [];
  const { data, error } = await getServiceSupabase()
    .from('campaign_job_steps')
    .select('*')
    .eq('job_id', job.id)
    .order('sort_order', { ascending: true });
  throwDatabaseError('Failed to load Campaign job steps', error);
  return (data ?? []) as CampaignJobStepRecord[];
}

export async function claimCampaignJob(
  workerId: string,
  leaseSeconds = 120
): Promise<CampaignJobRecord | null> {
  const { data, error } = await getServiceSupabase().rpc(
    'claim_campaign_job',
    {
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds,
    }
  );
  throwDatabaseError('Failed to claim Campaign job', error);
  return ((data as CampaignJobRecord[] | null)?.[0] ?? null);
}

export async function claimCampaignJobStep(
  jobId: string,
  workerId: string,
  leaseSeconds = 300
): Promise<CampaignJobStepRecord | null> {
  const { data, error } = await getServiceSupabase().rpc(
    'claim_campaign_job_step',
    {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds,
    }
  );
  throwDatabaseError('Failed to claim Campaign step', error);
  return ((data as CampaignJobStepRecord[] | null)?.[0] ?? null);
}

export async function renewCampaignJobLease(
  jobId: string,
  workerId: string,
  leaseSeconds = 120
): Promise<boolean> {
  const { data, error } = await getServiceSupabase().rpc(
    'renew_campaign_job_lease',
    {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds,
    }
  );
  throwDatabaseError('Failed to renew Campaign job lease', error);
  return data === true;
}

export async function completeCampaignJobStep(
  stepId: string,
  workerId: string,
  result: unknown
): Promise<boolean> {
  const { data, error } = await getServiceSupabase().rpc(
    'complete_campaign_job_step',
    {
      p_step_id: stepId,
      p_worker_id: workerId,
      p_result_snapshot: result ?? {},
    }
  );
  throwDatabaseError('Failed to complete Campaign step', error);
  return data === true;
}

export async function failCampaignJobStep(
  stepId: string,
  workerId: string,
  errorMessage: string,
  retryDelaySeconds = 30
): Promise<'queued' | 'failed' | 'not_owned'> {
  const { data, error } = await getServiceSupabase().rpc(
    'fail_campaign_job_step',
    {
      p_step_id: stepId,
      p_worker_id: workerId,
      p_error: errorMessage,
      p_retry_delay_seconds: retryDelaySeconds,
    }
  );
  throwDatabaseError('Failed to record Campaign step failure', error);
  return data === 'queued' || data === 'failed' ? data : 'not_owned';
}

export async function completeCampaignJob(
  jobId: string,
  workerId: string,
  summary: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await getServiceSupabase().rpc(
    'complete_campaign_job',
    {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_result_summary: summary,
    }
  );
  throwDatabaseError('Failed to complete Campaign job', error);
  return data === true;
}

export async function releaseCampaignJob(
  jobId: string,
  workerId: string
): Promise<boolean> {
  const { data, error } = await getServiceSupabase().rpc(
    'release_campaign_job',
    {
      p_job_id: jobId,
      p_worker_id: workerId,
    }
  );
  throwDatabaseError('Failed to release Campaign job', error);
  return data === true;
}

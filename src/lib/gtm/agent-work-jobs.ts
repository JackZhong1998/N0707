import 'server-only';

import { getServiceSupabase } from '@/lib/supabase';
import { ensureDefaultProject } from './database';
import type { DirectorAction, GtmStore } from './types';

export type AgentWorkJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentWorkStepStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface AgentWorkJobRecord {
  id: string;
  project_id: string;
  clerk_user_id: string;
  build_key: string;
  locale: 'en' | 'zh';
  kind: string;
  status: AgentWorkJobStatus;
  current_step: string | null;
  progress_completed: number;
  progress_total: number;
  attempt_count: number;
  max_attempts: number;
  priority: number;
  input_snapshot: GtmStore;
  meta: Record<string, unknown>;
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

export interface AgentWorkStepRecord {
  id: string;
  job_id: string;
  step_key: string;
  step_type: string;
  channel_id: string | null;
  sort_order: number;
  status: AgentWorkStepStatus;
  attempt_count: number;
  max_attempts: number;
  action_payload: Record<string, unknown>;
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

export type AgentWorkStepDraft = {
  stepKey: string;
  stepType: string;
  channelId?: string | null;
  sortOrder: number;
  actionPayload: Record<string, unknown>;
};

function throwDatabaseError(label: string, error: { message: string } | null) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function enqueueAgentWorkJob(input: {
  clerkUserId: string;
  buildKey: string;
  locale: string;
  store: GtmStore;
  kind?: string;
  meta?: Record<string, unknown>;
  steps: AgentWorkStepDraft[];
  priority?: number;
}): Promise<AgentWorkJobRecord> {
  if (input.steps.length === 0) {
    throw new Error('Agent work job requires at least one step');
  }
  const { project } = await ensureDefaultProject(input.clerkUserId);
  const supabase = getServiceSupabase();

  const { data: existing, error: existingError } = await supabase
    .from('agent_work_jobs')
    .select('*')
    .eq('project_id', project.id)
    .eq('build_key', input.buildKey)
    .maybeSingle();
  throwDatabaseError('Failed to look up agent work job', existingError);

  if (existing) {
    const job = existing as AgentWorkJobRecord;
    if (job.status === 'failed') {
      const { error: resetError } = await supabase
        .from('agent_work_jobs')
        .update({
          status: 'queued',
          input_snapshot: input.store,
          meta: input.meta ?? job.meta,
          attempt_count: 0,
          last_error: null,
          locked_by: null,
          locked_at: null,
          lease_expires_at: null,
          next_attempt_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      throwDatabaseError('Failed to requeue agent work job', resetError);
      await supabase
        .from('agent_work_steps')
        .update({
          status: 'queued',
          attempt_count: 0,
          last_error: null,
          locked_by: null,
          locked_at: null,
          lease_expires_at: null,
          next_attempt_at: new Date().toISOString(),
        })
        .eq('job_id', job.id)
        .eq('status', 'failed');
    }
    const refreshed = await getAgentWorkJob(input.clerkUserId, job.id);
    if (!refreshed) throw new Error('Agent work job missing after enqueue');
    return refreshed;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('agent_work_jobs')
    .insert({
      project_id: project.id,
      clerk_user_id: input.clerkUserId,
      build_key: input.buildKey,
      locale: input.locale === 'zh' ? 'zh' : 'en',
      kind: input.kind ?? 'director_actions',
      input_snapshot: input.store,
      meta: input.meta ?? {},
      progress_total: input.steps.length,
      priority: input.priority ?? 100,
    })
    .select('*')
    .single();
  throwDatabaseError('Failed to insert agent work job', insertError);
  const job = inserted as AgentWorkJobRecord;

  const { error: stepsError } = await supabase.from('agent_work_steps').insert(
    input.steps.map((step) => ({
      job_id: job.id,
      step_key: step.stepKey,
      step_type: step.stepType,
      channel_id: step.channelId ?? null,
      sort_order: step.sortOrder,
      action_payload: step.actionPayload,
    }))
  );
  throwDatabaseError('Failed to insert agent work steps', stepsError);

  return job;
}

export async function getAgentWorkJob(
  clerkUserId: string,
  jobId: string
): Promise<AgentWorkJobRecord | null> {
  const { project } = await ensureDefaultProject(clerkUserId);
  const { data, error } = await getServiceSupabase()
    .from('agent_work_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('project_id', project.id)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
  throwDatabaseError('Failed to load agent work job', error);
  return (data as AgentWorkJobRecord | null) ?? null;
}

export async function getLatestActiveAgentWorkJob(
  clerkUserId: string
): Promise<AgentWorkJobRecord | null> {
  const { project } = await ensureDefaultProject(clerkUserId);
  const { data, error } = await getServiceSupabase()
    .from('agent_work_jobs')
    .select('*')
    .eq('project_id', project.id)
    .eq('clerk_user_id', clerkUserId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwDatabaseError('Failed to load active agent work job', error);
  return (data as AgentWorkJobRecord | null) ?? null;
}

export async function listAgentWorkSteps(
  clerkUserId: string,
  jobId: string
): Promise<AgentWorkStepRecord[]> {
  const job = await getAgentWorkJob(clerkUserId, jobId);
  if (!job) return [];
  const { data, error } = await getServiceSupabase()
    .from('agent_work_steps')
    .select('*')
    .eq('job_id', job.id)
    .order('sort_order', { ascending: true });
  throwDatabaseError('Failed to load agent work steps', error);
  return (data ?? []) as AgentWorkStepRecord[];
}

export async function claimAgentWorkJob(
  workerId: string,
  leaseSeconds = 120
): Promise<AgentWorkJobRecord | null> {
  const { data, error } = await getServiceSupabase().rpc('claim_agent_work_job', {
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds,
  });
  throwDatabaseError('Failed to claim agent work job', error);
  return ((data as AgentWorkJobRecord[] | null)?.[0] ?? null);
}

export async function claimAgentWorkStep(
  jobId: string,
  workerId: string,
  leaseSeconds = 300
): Promise<AgentWorkStepRecord | null> {
  const { data, error } = await getServiceSupabase().rpc('claim_agent_work_step', {
    p_job_id: jobId,
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds,
  });
  throwDatabaseError('Failed to claim agent work step', error);
  return ((data as AgentWorkStepRecord[] | null)?.[0] ?? null);
}

export async function completeAgentWorkStep(
  stepId: string,
  workerId: string,
  result: unknown
): Promise<boolean> {
  const { data, error } = await getServiceSupabase().rpc(
    'complete_agent_work_step',
    {
      p_step_id: stepId,
      p_worker_id: workerId,
      p_result_snapshot: result ?? {},
    }
  );
  throwDatabaseError('Failed to complete agent work step', error);
  return data === true;
}

export async function failAgentWorkStep(
  stepId: string,
  workerId: string,
  errorMessage: string,
  retryDelaySeconds = 30
): Promise<'queued' | 'failed' | 'not_owned'> {
  const { data, error } = await getServiceSupabase().rpc('fail_agent_work_step', {
    p_step_id: stepId,
    p_worker_id: workerId,
    p_error: errorMessage,
    p_retry_delay_seconds: retryDelaySeconds,
  });
  throwDatabaseError('Failed to record agent work step failure', error);
  return data === 'queued' || data === 'failed' ? data : 'not_owned';
}

export async function completeAgentWorkJob(
  jobId: string,
  workerId: string,
  summary: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await getServiceSupabase().rpc(
    'complete_agent_work_job',
    {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_result_summary: summary,
    }
  );
  throwDatabaseError('Failed to complete agent work job', error);
  return data === true;
}

export async function releaseAgentWorkJob(
  jobId: string,
  workerId: string
): Promise<boolean> {
  const { data, error } = await getServiceSupabase().rpc(
    'release_agent_work_job',
    {
      p_job_id: jobId,
      p_worker_id: workerId,
    }
  );
  throwDatabaseError('Failed to release agent work job', error);
  return data === true;
}

export function actionsFingerprint(actions: DirectorAction[]): string {
  return actions
    .map((action) => {
      const raw = JSON.stringify(action);
      return raw.length > 120 ? raw.slice(0, 120) : raw;
    })
    .join('|');
}

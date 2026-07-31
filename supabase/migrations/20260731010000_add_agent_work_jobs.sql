-- Universal durable Agent work queue for offline LLM execution.
-- One global cron (e.g. cron-job.org) hits /api/internal/campaign-worker
-- which drains both campaign_jobs and agent_work_jobs.

create table if not exists public.agent_work_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  clerk_user_id text not null,
  build_key text not null,
  locale text not null default 'en' check (locale in ('en', 'zh')),
  kind text not null default 'director_actions',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  current_step text,
  progress_completed integer not null default 0 check (progress_completed >= 0),
  progress_total integer not null default 0 check (progress_total >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 100 check (max_attempts between 1 and 200),
  priority integer not null default 100,
  input_snapshot jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  result_summary jsonb,
  last_error text,
  locked_by text,
  locked_at timestamptz,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, build_key)
);

create table if not exists public.agent_work_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_work_jobs(id) on delete cascade,
  step_key text not null,
  step_type text not null,
  channel_id text,
  sort_order integer not null check (sort_order >= 0),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  action_payload jsonb not null default '{}'::jsonb,
  result_snapshot jsonb,
  last_error text,
  locked_by text,
  locked_at timestamptz,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, step_key)
);

create index if not exists idx_agent_work_jobs_claim
  on public.agent_work_jobs(status, next_attempt_at, priority, created_at);
create index if not exists idx_agent_work_jobs_project
  on public.agent_work_jobs(project_id, created_at desc);
create index if not exists idx_agent_work_jobs_lease
  on public.agent_work_jobs(lease_expires_at)
  where status = 'running';
create index if not exists idx_agent_work_steps_claim
  on public.agent_work_steps(job_id, status, sort_order, next_attempt_at);
create index if not exists idx_agent_work_steps_lease
  on public.agent_work_steps(lease_expires_at)
  where status = 'running';

drop trigger if exists agent_work_jobs_updated_at on public.agent_work_jobs;
create trigger agent_work_jobs_updated_at
before update on public.agent_work_jobs
for each row execute function public.set_updated_at();

drop trigger if exists agent_work_steps_updated_at on public.agent_work_steps;
create trigger agent_work_steps_updated_at
before update on public.agent_work_steps
for each row execute function public.set_updated_at();

create or replace function public.claim_agent_work_job(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns setof public.agent_work_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_lease_seconds integer := greatest(30, least(p_lease_seconds, 900));
begin
  if coalesce(length(trim(p_worker_id)), 0) < 3 then
    raise exception 'Invalid worker id';
  end if;

  update public.agent_work_steps
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      next_attempt_at = case
        when attempt_count >= max_attempts then next_attempt_at
        else now()
      end,
      last_error = coalesce(last_error, 'Worker lease expired')
  where status = 'running'
    and lease_expires_at < now();

  update public.agent_work_jobs
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      next_attempt_at = case
        when attempt_count >= max_attempts then next_attempt_at
        else now()
      end,
      last_error = coalesce(last_error, 'Worker lease expired')
  where status = 'running'
    and lease_expires_at < now();

  select id into v_job_id
  from public.agent_work_jobs
  where status = 'queued'
    and next_attempt_at <= now()
    and attempt_count < max_attempts
  order by priority asc, created_at asc
  for update skip locked
  limit 1;

  if v_job_id is null then
    return;
  end if;

  return query
  update public.agent_work_jobs
  set status = 'running',
      attempt_count = attempt_count + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lease_expires_at = now() + make_interval(secs => v_lease_seconds),
      heartbeat_at = now(),
      started_at = coalesce(started_at, now()),
      last_error = null
  where id = v_job_id
  returning *;
end;
$$;

create or replace function public.claim_agent_work_step(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns setof public.agent_work_steps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step_id uuid;
  v_lease_seconds integer := greatest(30, least(p_lease_seconds, 900));
begin
  if not exists (
    select 1 from public.agent_work_jobs
    where id = p_job_id
      and status = 'running'
      and locked_by = p_worker_id
      and lease_expires_at > now()
  ) then
    return;
  end if;

  select candidate.id into v_step_id
  from public.agent_work_steps candidate
  where candidate.job_id = p_job_id
    and candidate.status = 'queued'
    and candidate.next_attempt_at <= now()
    and candidate.attempt_count < candidate.max_attempts
    and not exists (
      select 1
      from public.agent_work_steps earlier
      where earlier.job_id = candidate.job_id
        and earlier.sort_order < candidate.sort_order
        and earlier.status not in ('completed', 'skipped')
    )
  order by candidate.sort_order asc
  for update skip locked
  limit 1;

  if v_step_id is null then
    return;
  end if;

  return query
  update public.agent_work_steps
  set status = 'running',
      attempt_count = attempt_count + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lease_expires_at = now() + make_interval(secs => v_lease_seconds),
      started_at = coalesce(started_at, now()),
      last_error = null
  where id = v_step_id
  returning *;

  update public.agent_work_jobs
  set current_step = (
        select step_key from public.agent_work_steps where id = v_step_id
      ),
      heartbeat_at = now()
  where id = p_job_id and locked_by = p_worker_id;
end;
$$;

create or replace function public.complete_agent_work_step(
  p_step_id uuid,
  p_worker_id text,
  p_result_snapshot jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  update public.agent_work_steps
  set status = 'completed',
      result_snapshot = coalesce(p_result_snapshot, '{}'::jsonb),
      completed_at = now(),
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      last_error = null
  where id = p_step_id
    and status = 'running'
    and locked_by = p_worker_id
  returning job_id into v_job_id;

  if v_job_id is null then
    return false;
  end if;

  update public.agent_work_jobs
  set current_step = (
        select step_key from public.agent_work_steps where id = p_step_id
      ),
      progress_completed = (
        select count(*)
        from public.agent_work_steps
        where job_id = v_job_id and status in ('completed', 'skipped')
      )
  where id = v_job_id;

  return true;
end;
$$;

create or replace function public.fail_agent_work_step(
  p_step_id uuid,
  p_worker_id text,
  p_error text,
  p_retry_delay_seconds integer default 30
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_status text;
begin
  update public.agent_work_steps
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      next_attempt_at = case
        when attempt_count >= max_attempts then next_attempt_at
        else now() + make_interval(
          secs => greatest(1, least(p_retry_delay_seconds, 3600))
        )
      end,
      last_error = left(coalesce(p_error, 'Agent work step failed'), 4000),
      locked_by = null,
      locked_at = null,
      lease_expires_at = null
  where id = p_step_id
    and status = 'running'
    and locked_by = p_worker_id
  returning job_id, status into v_job_id, v_status;

  if v_job_id is null then
    return 'not_owned';
  end if;

  update public.agent_work_jobs
  set status = case when v_status = 'failed' then 'failed' else 'queued' end,
      current_step = (
        select step_key from public.agent_work_steps where id = p_step_id
      ),
      next_attempt_at = case
        when v_status = 'failed' then next_attempt_at
        else now() + make_interval(
          secs => greatest(1, least(p_retry_delay_seconds, 3600))
        )
      end,
      last_error = left(coalesce(p_error, 'Agent work step failed'), 4000),
      locked_by = null,
      locked_at = null,
      lease_expires_at = null
  where id = v_job_id;

  return v_status;
end;
$$;

create or replace function public.complete_agent_work_job(
  p_job_id uuid,
  p_worker_id text,
  p_result_summary jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if exists (
    select 1 from public.agent_work_steps
    where job_id = p_job_id and status not in ('completed', 'skipped')
  ) then
    return false;
  end if;

  update public.agent_work_jobs
  set status = 'completed',
      result_summary = coalesce(p_result_summary, '{}'::jsonb),
      progress_completed = progress_total,
      completed_at = now(),
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      last_error = null
  where id = p_job_id
    and status = 'running'
    and locked_by = p_worker_id;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.release_agent_work_job(
  p_job_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.agent_work_jobs
  set status = 'queued',
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      next_attempt_at = now()
  where id = p_job_id
    and status = 'running'
    and locked_by = p_worker_id
    and not exists (
      select 1 from public.agent_work_steps
      where job_id = p_job_id and status = 'failed'
    )
    and exists (
      select 1 from public.agent_work_steps
      where job_id = p_job_id and status not in ('completed', 'skipped')
    );
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

alter table public.agent_work_jobs enable row level security;
alter table public.agent_work_steps enable row level security;

revoke all on public.agent_work_jobs, public.agent_work_steps
  from anon, authenticated;
grant all on public.agent_work_jobs, public.agent_work_steps
  to service_role;

revoke execute on function public.claim_agent_work_job(text, integer)
  from public, anon, authenticated;
revoke execute on function public.claim_agent_work_step(uuid, text, integer)
  from public, anon, authenticated;
revoke execute on function public.complete_agent_work_step(uuid, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.fail_agent_work_step(uuid, text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.complete_agent_work_job(uuid, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.release_agent_work_job(uuid, text)
  from public, anon, authenticated;

grant execute on function public.claim_agent_work_job(text, integer)
  to service_role;
grant execute on function public.claim_agent_work_step(uuid, text, integer)
  to service_role;
grant execute on function public.complete_agent_work_step(uuid, text, jsonb)
  to service_role;
grant execute on function public.fail_agent_work_step(uuid, text, text, integer)
  to service_role;
grant execute on function public.complete_agent_work_job(uuid, text, jsonb)
  to service_role;
grant execute on function public.release_agent_work_job(uuid, text)
  to service_role;

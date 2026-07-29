-- Durable, resumable Campaign generation.
--
-- This migration is intentionally self-contained: production may have skipped
-- earlier additive migrations, so it first repairs the canonical state and
-- Agent inbox columns before creating the worker queue.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.gtm_projects
  add column if not exists state_revision bigint not null default 0;
alter table public.gtm_projects
  add column if not exists state_snapshot jsonb;

alter table public.project_contexts
  add column if not exists conversation_summary text not null default '';
alter table public.project_contexts
  add column if not exists memory_facts jsonb not null default '[]'::jsonb;
alter table public.project_contexts
  add column if not exists pending_agent_requests jsonb not null default '[]'::jsonb;
alter table public.project_contexts
  add column if not exists agent_action_jobs jsonb not null default '[]'::jsonb;
alter table public.project_contexts
  add column if not exists artifacts jsonb not null default '[]'::jsonb;
alter table public.project_contexts
  add column if not exists agent_notifications jsonb not null default '[]'::jsonb;
alter table public.project_contexts
  add column if not exists last_reflection_at timestamptz;

alter table public.messages add column if not exists context_ref jsonb;
alter table public.messages
  add column if not exists reply_to_message_ids jsonb not null default '[]'::jsonb;
alter table public.messages add column if not exists lane text;
alter table public.messages add column if not exists agent_job_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gtm_projects_state_revision_check'
      and conrelid = 'public.gtm_projects'::regclass
  ) then
    alter table public.gtm_projects
      add constraint gtm_projects_state_revision_check
      check (state_revision >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_lane_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_lane_check
      check (lane is null or lane in ('foreground', 'background', 'proactive'));
  end if;
end
$$;

comment on column public.gtm_projects.state_revision is
  'Monotonic compare-and-swap revision for the canonical GTM snapshot.';
comment on column public.gtm_projects.state_snapshot is
  'Canonical bounded GtmStore JSON; normalized tables are query projections.';

create table if not exists public.campaign_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  clerk_user_id text not null,
  build_key text not null,
  locale text not null default 'en' check (locale in ('en', 'zh')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  current_step text,
  progress_completed integer not null default 0 check (progress_completed >= 0),
  progress_total integer not null default 0 check (progress_total >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 100 check (max_attempts between 1 and 200),
  priority integer not null default 100,
  input_snapshot jsonb not null,
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

create table if not exists public.campaign_job_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.campaign_jobs(id) on delete cascade,
  step_key text not null,
  step_type text not null
    check (step_type in ('blueprint', 'channel_strategy', 'channel_calendar', 'finalize')),
  channel_id text,
  sort_order integer not null check (sort_order >= 0),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  input_snapshot jsonb not null default '{}'::jsonb,
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
  unique (job_id, step_key),
  check (
    (step_type in ('channel_strategy', 'channel_calendar') and channel_id is not null)
    or
    (step_type in ('blueprint', 'finalize') and channel_id is null)
  )
);

create index if not exists idx_campaign_jobs_claim
  on public.campaign_jobs(status, next_attempt_at, priority, created_at);
create index if not exists idx_campaign_jobs_project
  on public.campaign_jobs(project_id, created_at desc);
create unique index if not exists idx_campaign_jobs_one_active_per_project
  on public.campaign_jobs(project_id)
  where status in ('queued', 'running');
create index if not exists idx_campaign_jobs_lease
  on public.campaign_jobs(lease_expires_at)
  where status = 'running';
create index if not exists idx_campaign_job_steps_claim
  on public.campaign_job_steps(job_id, status, sort_order, next_attempt_at);
create index if not exists idx_campaign_job_steps_lease
  on public.campaign_job_steps(lease_expires_at)
  where status = 'running';

drop trigger if exists campaign_jobs_updated_at on public.campaign_jobs;
create trigger campaign_jobs_updated_at
before update on public.campaign_jobs
for each row execute function public.set_updated_at();

drop trigger if exists campaign_job_steps_updated_at on public.campaign_job_steps;
create trigger campaign_job_steps_updated_at
before update on public.campaign_job_steps
for each row execute function public.set_updated_at();

-- Atomically create a job and its deterministic step graph. Reusing the same
-- build key returns the existing job and never duplicates AI work.
create or replace function public.enqueue_campaign_job(
  p_project_id uuid,
  p_clerk_user_id text,
  p_build_key text,
  p_locale text,
  p_input_snapshot jsonb,
  p_channel_ids text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_channel_id text;
  v_ordinal integer;
begin
  if coalesce(length(trim(p_build_key)), 0) < 8
    or length(p_build_key) > 200 then
    raise exception 'Invalid campaign build key';
  end if;
  if p_input_snapshot is null or jsonb_typeof(p_input_snapshot) <> 'object' then
    raise exception 'Campaign input snapshot must be a JSON object';
  end if;
  if coalesce(array_length(p_channel_ids, 1), 0) < 1
    or array_length(p_channel_ids, 1) > 32 then
    raise exception 'Campaign requires between 1 and 32 channels';
  end if;
  if not exists (
    select 1
    from public.gtm_projects project
    join public.app_users app_user on app_user.id = project.owner_id
    where project.id = p_project_id
      and app_user.clerk_user_id = p_clerk_user_id
  ) then
    raise exception 'Campaign project ownership mismatch';
  end if;

  insert into public.campaign_jobs (
    project_id,
    clerk_user_id,
    build_key,
    locale,
    input_snapshot,
    progress_total
  )
  values (
    p_project_id,
    p_clerk_user_id,
    p_build_key,
    case when p_locale = 'zh' then 'zh' else 'en' end,
    p_input_snapshot,
    2 + (array_length(p_channel_ids, 1) * 2)
  )
  on conflict (project_id, build_key) do update
  set input_snapshot = case
        when campaign_jobs.status in ('queued', 'failed')
          then excluded.input_snapshot
        else campaign_jobs.input_snapshot
      end,
      next_attempt_at = case
        when campaign_jobs.status = 'failed'
          then now()
        else campaign_jobs.next_attempt_at
      end,
      status = case
        when campaign_jobs.status = 'failed' then 'queued'
        else campaign_jobs.status
      end,
      attempt_count = case
        when campaign_jobs.status = 'failed' then 0
        else campaign_jobs.attempt_count
      end,
      last_error = case
        when campaign_jobs.status = 'failed' then null
        else campaign_jobs.last_error
      end,
      locked_by = case when campaign_jobs.status = 'failed' then null else campaign_jobs.locked_by end,
      locked_at = case when campaign_jobs.status = 'failed' then null else campaign_jobs.locked_at end,
      lease_expires_at = case when campaign_jobs.status = 'failed' then null else campaign_jobs.lease_expires_at end
  returning id into v_job_id;

  update public.campaign_job_steps
  set status = 'queued',
      attempt_count = 0,
      last_error = null,
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      next_attempt_at = now()
  where job_id = v_job_id and status = 'failed';

  insert into public.campaign_job_steps (
    job_id, step_key, step_type, sort_order
  )
  values (v_job_id, 'blueprint', 'blueprint', 100)
  on conflict (job_id, step_key) do nothing;

  for v_channel_id, v_ordinal in
    select channel_id, ordinality::integer
    from unnest(p_channel_ids) with ordinality as channel(channel_id, ordinality)
  loop
    insert into public.campaign_job_steps (
      job_id, step_key, step_type, channel_id, sort_order
    )
    values (
      v_job_id,
      'channel_strategy:' || v_channel_id,
      'channel_strategy',
      v_channel_id,
      200 + v_ordinal
    )
    on conflict (job_id, step_key) do nothing;

    insert into public.campaign_job_steps (
      job_id, step_key, step_type, channel_id, sort_order
    )
    values (
      v_job_id,
      'channel_calendar:' || v_channel_id,
      'channel_calendar',
      v_channel_id,
      500 + v_ordinal
    )
    on conflict (job_id, step_key) do nothing;
  end loop;

  insert into public.campaign_job_steps (
    job_id, step_key, step_type, sort_order
  )
  values (v_job_id, 'finalize', 'finalize', 900)
  on conflict (job_id, step_key) do nothing;

  update public.campaign_jobs
  set progress_total = (
    select count(*) from public.campaign_job_steps where job_id = v_job_id
  )
  where id = v_job_id;

  return v_job_id;
end;
$$;

-- Claim one job with a renewable lease. Expired workers are recoverable.
create or replace function public.claim_campaign_job(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns setof public.campaign_jobs
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

  update public.campaign_job_steps
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

  update public.campaign_jobs
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
  from public.campaign_jobs
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
  update public.campaign_jobs
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

-- Steps are deterministic and ordered. A later step is not claimable until
-- all earlier steps are completed or intentionally skipped.
create or replace function public.claim_campaign_job_step(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns setof public.campaign_job_steps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step_id uuid;
  v_lease_seconds integer := greatest(30, least(p_lease_seconds, 900));
begin
  if not exists (
    select 1 from public.campaign_jobs
    where id = p_job_id
      and status = 'running'
      and locked_by = p_worker_id
      and lease_expires_at > now()
  ) then
    return;
  end if;

  select candidate.id into v_step_id
  from public.campaign_job_steps candidate
  where candidate.job_id = p_job_id
    and candidate.status = 'queued'
    and candidate.next_attempt_at <= now()
    and candidate.attempt_count < candidate.max_attempts
    and not exists (
      select 1
      from public.campaign_job_steps earlier
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
  update public.campaign_job_steps
  set status = 'running',
      attempt_count = attempt_count + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lease_expires_at = now() + make_interval(secs => v_lease_seconds),
      started_at = coalesce(started_at, now()),
      last_error = null
  where id = v_step_id
  returning *;

  update public.campaign_jobs
  set current_step = (
        select step_key from public.campaign_job_steps where id = v_step_id
      ),
      heartbeat_at = now()
  where id = p_job_id and locked_by = p_worker_id;
end;
$$;

create or replace function public.renew_campaign_job_lease(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.campaign_jobs
  set lease_expires_at = now() + make_interval(
        secs => greatest(30, least(p_lease_seconds, 900))
      ),
      heartbeat_at = now()
  where id = p_job_id
    and status = 'running'
    and locked_by = p_worker_id;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.complete_campaign_job_step(
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
  update public.campaign_job_steps
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

  update public.campaign_jobs
  set current_step = (
        select step_key from public.campaign_job_steps where id = p_step_id
      ),
      progress_completed = (
        select count(*)
        from public.campaign_job_steps
        where job_id = v_job_id and status in ('completed', 'skipped')
      )
  where id = v_job_id;

  return true;
end;
$$;

create or replace function public.fail_campaign_job_step(
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
  update public.campaign_job_steps
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      next_attempt_at = case
        when attempt_count >= max_attempts then next_attempt_at
        else now() + make_interval(
          secs => greatest(1, least(p_retry_delay_seconds, 3600))
        )
      end,
      last_error = left(coalesce(p_error, 'Campaign step failed'), 4000),
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

  update public.campaign_jobs
  set status = case when v_status = 'failed' then 'failed' else 'queued' end,
      current_step = (
        select step_key from public.campaign_job_steps where id = p_step_id
      ),
      next_attempt_at = case
        when v_status = 'failed' then next_attempt_at
        else now() + make_interval(
          secs => greatest(1, least(p_retry_delay_seconds, 3600))
        )
      end,
      last_error = left(coalesce(p_error, 'Campaign step failed'), 4000),
      locked_by = null,
      locked_at = null,
      lease_expires_at = null
  where id = v_job_id;

  return v_status;
end;
$$;

create or replace function public.complete_campaign_job(
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
    select 1 from public.campaign_job_steps
    where job_id = p_job_id and status not in ('completed', 'skipped')
  ) then
    return false;
  end if;

  update public.campaign_jobs
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

create or replace function public.release_campaign_job(
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
  update public.campaign_jobs
  set status = 'queued',
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      next_attempt_at = now()
  where id = p_job_id
    and status = 'running'
    and locked_by = p_worker_id
    and not exists (
      select 1 from public.campaign_job_steps
      where job_id = p_job_id and status = 'failed'
    )
    and exists (
      select 1 from public.campaign_job_steps
      where job_id = p_job_id and status not in ('completed', 'skipped')
    );
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

alter table public.campaign_jobs enable row level security;
alter table public.campaign_job_steps enable row level security;

revoke all on public.campaign_jobs, public.campaign_job_steps
  from anon, authenticated;
grant all on public.campaign_jobs, public.campaign_job_steps
  to service_role;

revoke execute on function public.enqueue_campaign_job(
  uuid, text, text, text, jsonb, text[]
) from public, anon, authenticated;
revoke execute on function public.claim_campaign_job(text, integer)
  from public, anon, authenticated;
revoke execute on function public.claim_campaign_job_step(uuid, text, integer)
  from public, anon, authenticated;
revoke execute on function public.renew_campaign_job_lease(uuid, text, integer)
  from public, anon, authenticated;
revoke execute on function public.complete_campaign_job_step(uuid, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.fail_campaign_job_step(uuid, text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.complete_campaign_job(uuid, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.release_campaign_job(uuid, text)
  from public, anon, authenticated;

grant execute on function public.enqueue_campaign_job(
  uuid, text, text, text, jsonb, text[]
) to service_role;
grant execute on function public.claim_campaign_job(text, integer)
  to service_role;
grant execute on function public.claim_campaign_job_step(uuid, text, integer)
  to service_role;
grant execute on function public.renew_campaign_job_lease(uuid, text, integer)
  to service_role;
grant execute on function public.complete_campaign_job_step(uuid, text, jsonb)
  to service_role;
grant execute on function public.fail_campaign_job_step(uuid, text, text, integer)
  to service_role;
grant execute on function public.complete_campaign_job(uuid, text, jsonb)
  to service_role;
grant execute on function public.release_campaign_job(uuid, text)
  to service_role;

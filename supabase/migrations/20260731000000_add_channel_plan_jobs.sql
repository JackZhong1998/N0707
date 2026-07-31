-- Partial channel-plan jobs for Launch Partner conversation.
-- Reuses campaign_jobs / campaign_job_steps so work survives tab close,
-- sleep, and refresh. Full campaign builds stay job_kind = 'full_campaign'.

alter table public.campaign_jobs
  add column if not exists job_kind text not null default 'full_campaign';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaign_jobs_job_kind_check'
      and conrelid = 'public.campaign_jobs'::regclass
  ) then
    alter table public.campaign_jobs
      add constraint campaign_jobs_job_kind_check
      check (job_kind in ('full_campaign', 'channel_plans'));
  end if;
end
$$;

comment on column public.campaign_jobs.job_kind is
  'full_campaign = blueprint+strategies+calendars; channel_plans = strategy steps only.';

-- Director-triggered channel plans: only channel_strategy steps + finalize.
create or replace function public.enqueue_channel_plan_job(
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
  v_active_id uuid;
  v_active_kind text;
begin
  if coalesce(length(trim(p_build_key)), 0) < 8
    or length(p_build_key) > 240 then
    raise exception 'Invalid channel-plan build key';
  end if;
  if p_input_snapshot is null or jsonb_typeof(p_input_snapshot) <> 'object' then
    raise exception 'Channel-plan input snapshot must be a JSON object';
  end if;
  if coalesce(array_length(p_channel_ids, 1), 0) < 1
    or array_length(p_channel_ids, 1) > 32 then
    raise exception 'Channel-plan job requires between 1 and 32 channels';
  end if;
  if not exists (
    select 1
    from public.gtm_projects project
    join public.app_users app_user on app_user.id = project.owner_id
    where project.id = p_project_id
      and app_user.clerk_user_id = p_clerk_user_id
  ) then
    raise exception 'Channel-plan project ownership mismatch';
  end if;

  select id, job_kind into v_active_id, v_active_kind
  from public.campaign_jobs
  where project_id = p_project_id
    and status in ('queued', 'running')
    and build_key <> p_build_key
  limit 1;

  if v_active_id is not null then
    raise exception 'Active campaign job already running (%)', coalesce(v_active_kind, 'unknown');
  end if;

  insert into public.campaign_jobs (
    project_id,
    clerk_user_id,
    build_key,
    locale,
    job_kind,
    input_snapshot,
    progress_total
  )
  values (
    p_project_id,
    p_clerk_user_id,
    p_build_key,
    case when p_locale = 'zh' then 'zh' else 'en' end,
    'channel_plans',
    p_input_snapshot,
    array_length(p_channel_ids, 1) + 1
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
  end loop;

  insert into public.campaign_job_steps (
    job_id, step_key, step_type, sort_order
  )
  values (v_job_id, 'finalize', 'finalize', 900)
  on conflict (job_id, step_key) do nothing;

  update public.campaign_jobs
  set progress_total = (
    select count(*) from public.campaign_job_steps where job_id = v_job_id
  ),
      job_kind = 'channel_plans'
  where id = v_job_id;

  return v_job_id;
end;
$$;

revoke execute on function public.enqueue_channel_plan_job(
  uuid, text, text, text, jsonb, text[]
) from public, anon, authenticated;
grant execute on function public.enqueue_channel_plan_job(
  uuid, text, text, text, jsonb, text[]
) to service_role;

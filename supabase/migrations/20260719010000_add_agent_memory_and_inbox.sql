-- Persistent memory, resumable conversation inbox, long-form artifacts and
-- non-interrupting proactive notifications.

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

alter table public.messages
  add column if not exists context_ref jsonb;

alter table public.messages
  add column if not exists reply_to_message_ids jsonb not null default '[]'::jsonb;

alter table public.messages
  add column if not exists lane text;

alter table public.messages
  add column if not exists agent_job_id text;

do $$
begin
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

alter table public.ai_usage_events add column if not exists provider text;
alter table public.ai_usage_events add column if not exists cached_tokens bigint not null default 0 check (cached_tokens >= 0);
alter table public.ai_usage_events add column if not exists cache_write_tokens bigint not null default 0 check (cache_write_tokens >= 0);
alter table public.ai_usage_events add column if not exists duration_ms integer not null default 0 check (duration_ms >= 0);
alter table public.ai_usage_events add column if not exists agent_name text;
alter table public.ai_usage_events add column if not exists operation text;
alter table public.ai_usage_events add column if not exists trace_id text;
alter table public.ai_usage_events add column if not exists session_id text;
alter table public.ai_usage_events add column if not exists prompt_hash text;
alter table public.ai_usage_events add column if not exists system_chars integer not null default 0 check (system_chars >= 0);
alter table public.ai_usage_events add column if not exists user_chars integer not null default 0 check (user_chars >= 0);
alter table public.ai_usage_events add column if not exists message_count integer not null default 0 check (message_count >= 0);
alter table public.ai_usage_events add column if not exists json_attempt integer not null default 1 check (json_attempt >= 1);
alter table public.ai_usage_events add column if not exists model_attempt integer not null default 1 check (model_attempt >= 1);
alter table public.ai_usage_events add column if not exists trace_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_ai_usage_trace_id
  on public.ai_usage_events(trace_id) where trace_id is not null;
create index if not exists idx_ai_usage_agent_created
  on public.ai_usage_events(agent_name, created_at desc);

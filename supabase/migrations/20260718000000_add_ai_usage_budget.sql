create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  request_id text,
  model text not null,
  prompt_tokens bigint not null default 0 check (prompt_tokens >= 0),
  completion_tokens bigint not null default 0 check (completion_tokens >= 0),
  provider_cost_usd numeric(14, 8) not null default 0 check (provider_cost_usd >= 0),
  billed_cost_usd numeric(14, 8) not null default 0 check (billed_cost_usd >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.get_ai_monthly_spend(
  p_user_id text,
  p_month_start timestamptz
)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(billed_cost_usd), 0)
  from public.ai_usage_events
  where user_id = p_user_id
    and created_at >= p_month_start
    and created_at < p_month_start + interval '1 month';
$$;

create index if not exists idx_ai_usage_user_month
  on public.ai_usage_events(user_id, created_at);
create unique index if not exists idx_ai_usage_request_id
  on public.ai_usage_events(request_id) where request_id is not null;

alter table public.ai_usage_events enable row level security;
revoke all on public.ai_usage_events from anon, authenticated;
grant all on public.ai_usage_events to service_role;
revoke execute on function public.get_ai_monthly_spend(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_ai_monthly_spend(text, timestamptz)
  to service_role;

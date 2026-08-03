-- Store each free Market Strategy Report as one complete, immutable payload.
-- A launch can produce exactly one stored report; retries read the existing row.
create table if not exists public.market_strategy_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  launch_id text not null,
  locale text not null check (locale in ('zh', 'en')),
  product_name text not null default '',
  report_markdown text not null,
  report jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, launch_id)
);

comment on table public.market_strategy_reports is
  'One complete free 30-day Market Strategy Report per Launch. Insert-only from the server.';

alter table public.market_strategy_reports enable row level security;
revoke all on public.market_strategy_reports from anon, authenticated;
grant all on public.market_strategy_reports to service_role;

-- Multi-market publishing: the project owns reusable market choices while
-- every Todo records the selected market and the exact output locale.

alter table public.gtm_projects
  add column if not exists target_markets jsonb not null default '[]'::jsonb;

alter table public.todos
  add column if not exists target_market_id text;
alter table public.todos
  add column if not exists output_locale text;

create index if not exists idx_todos_project_target_market
  on public.todos(project_id, target_market_id);

comment on column public.gtm_projects.target_markets is
  'User-confirmed target market options, including region, audience, language label, and BCP-47 locale.';
comment on column public.todos.target_market_id is
  'Selected project target market for this deliverable.';
comment on column public.todos.output_locale is
  'BCP-47 publishing locale for this Todo; independent from the UI locale.';

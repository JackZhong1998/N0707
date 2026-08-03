-- NowBuild application schema
-- Authentication is handled by Clerk. All application data is accessed by the
-- Next.js server with a Supabase secret/service-role key; browser roles receive
-- no direct table privileges.
-- After applying this baseline, also apply every file in supabase/migrations;
-- the resumable Campaign queue RPCs live in the dated migration so upgrades
-- and fresh installations use the same function definitions.

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

-- Clerk identity mirror. We intentionally do not store passwords or card data.
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A user can have multiple GTM projects later. The current UI uses one default
-- project, enforced by (owner_id, slug).
create table if not exists public.gtm_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  slug text not null default 'default',
  name text not null default 'My GTM Project',
  store_version integer not null default 5,
  plan_ready boolean not null default false,
  start_date date,
  -- Canonical client state. `state_revision` is compared and incremented in
  -- the same UPDATE that writes `state_snapshot`, preventing torn multi-table
  -- reads when two tabs save concurrently.
  state_revision bigint not null default 0 check (state_revision >= 0),
  state_snapshot jsonb,
  -- Queryable projection of user-confirmed Launch Kit data, including the
  -- public source URL and captured asset provenance.
  directory_launch_kit jsonb,
  -- User-confirmed markets available to individual Todos.
  target_markets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

-- Long-lived context maintained by the context agent.
create table if not exists public.project_contexts (
  project_id uuid primary key references public.gtm_projects(id) on delete cascade,
  user_profile_doc text not null default '',
  project_profile_doc text not null default '',
  conversation_summary text not null default '',
  memory_facts jsonb not null default '[]'::jsonb,
  pending_agent_requests jsonb not null default '[]'::jsonb,
  agent_action_jobs jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  agent_notifications jsonb not null default '[]'::jsonb,
  last_reflection_at timestamptz,
  messages_since_sync integer not null default 0 check (messages_since_sync >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Director chat and each todo-specialist chat are separate conversations.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  kind text not null check (kind in ('director', 'todo_specialist')),
  topic_key text not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, kind, topic_key)
);

create table if not exists public.messages (
  id text not null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  card jsonb,
  context_ref jsonb,
  reply_to_message_ids jsonb not null default '[]'::jsonb,
  lane text check (lane is null or lane in ('foreground', 'background', 'proactive')),
  agent_job_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, id)
);

create table if not exists public.market_strategies (
  project_id uuid primary key references public.gtm_projects(id) on delete cascade,
  overview_markdown text not null default '',
  goal text not null default '',
  strategy_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Immutable free lead-magnet deliverable. The complete report is inserted in
-- one operation and the unique launch key prevents duplicate uploads/retries.
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

create table if not exists public.channel_strategies (
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  channel_id text not null,
  channel_name text not null,
  positioning text not null default '',
  direction text not null default '',
  content_pillars jsonb not null default '[]'::jsonb,
  markdown text not null default '',
  strategy_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, channel_id)
);

create table if not exists public.project_channels (
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  channel_id text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, channel_id)
);

-- A topic is channel-independent: it records why an idea matters. Each topic
-- can fan out into several channel-specific variants below.
create table if not exists public.topics (
  id text not null,
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  title text not null,
  source text not null default 'user'
    check (source in ('strategy', 'user', 'research', 'performance', 'agent', 'custom')),
  source_label text,
  target_audience text not null default '',
  pain_point text not null default '',
  core_point text not null default '',
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status text not null default 'idea'
    check (status in ('idea', 'shortlisted', 'scheduled', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.topic_variants (
  id text not null,
  project_id uuid not null,
  topic_id text not null,
  channel_id text not null,
  channel_name text not null,
  hook text not null default '',
  angle text not null default '',
  content_format text not null default '',
  cta text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'selected', 'scheduled', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id),
  foreign key (project_id, topic_id)
    references public.topics(project_id, id) on delete cascade
);

create table if not exists public.todos (
  id text not null,
  project_id uuid not null references public.gtm_projects(id) on delete cascade,
  topic_variant_id text,
  channel_id text not null,
  channel_name text not null,
  day_index integer not null check (day_index between 1 and 365),
  due_date date not null,
  due_time time,
  title text not null,
  brief text not null default '',
  purpose text,
  pillar text,
  task_type text,
  phase text,
  market text,
  target_market_id text,
  output_locale text,
  audience text,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  launch_status text not null default 'planned'
    check (launch_status in (
      'planned', 'generating', 'draft', 'ready', 'needs_action',
      'publishing', 'published', 'completed', 'skipped', 'failed', 'replanning'
    )),
  revision integer not null default 1 check (revision >= 1),
  content_title text,
  content_body text,
  content_status text not null default 'none' check (content_status in ('none', 'writing', 'ready')),
  publish_status text not null default 'not_started'
    check (publish_status in (
      'not_started', 'opening', 'filling', 'needs_user_action',
      'awaiting_user', 'publishing', 'published', 'failed'
    )),
  published_url text,
  published_at timestamptz,
  publish_error text,
  tracking_status text not null default 'not_started'
    check (tracking_status in (
      'not_started', 'active', 'collecting', 'needs_user', 'failed', 'completed'
    )),
  metric_snapshots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

alter table public.todos
  drop constraint if exists todos_topic_variant_fk;
alter table public.todos
  add constraint todos_topic_variant_fk
  foreign key (project_id, topic_variant_id)
  references public.topic_variants(project_id, id);

-- Durable Campaign queue. Workers claim jobs and deterministic steps through
-- the security-definer functions below; browsers never access these tables.
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

-- Keep user_id as Clerk's text ID so this migration remains compatible with
-- the starter schema that may already be installed.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'free',
  billing_cycle text,
  status text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  stripe_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stripe can retry and deliver events out of order. Event IDs provide an
-- idempotency ledger and error status makes failed events retryable.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  livemode boolean not null default false,
  object_id text,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  error text,
  stripe_created_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Immutable per-request AI usage ledger. Costs are stored in USD using the
-- actual amount returned by OpenRouter plus the configured credit purchase fee.
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

-- Add columns when upgrading an installation of the original starter schema.
alter table public.gtm_projects add column if not exists state_revision bigint not null default 0;
alter table public.gtm_projects add column if not exists state_snapshot jsonb;
alter table public.subscriptions add column if not exists stripe_price_id text;
alter table public.subscriptions add column if not exists billing_cycle text;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists canceled_at timestamptz;
alter table public.subscriptions add column if not exists stripe_event_created_at timestamptz;
alter table public.todos add column if not exists publish_status text not null default 'not_started';
alter table public.todos add column if not exists published_url text;
alter table public.todos add column if not exists published_at timestamptz;
alter table public.todos add column if not exists publish_error text;
alter table public.todos add column if not exists tracking_status text not null default 'not_started';
alter table public.todos add column if not exists metric_snapshots jsonb not null default '[]'::jsonb;
alter table public.todos add column if not exists purpose text;
alter table public.todos add column if not exists pillar text;
alter table public.todos add column if not exists task_type text;
alter table public.todos add column if not exists launch_status text not null default 'planned';
alter table public.todos add column if not exists revision integer not null default 1;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'todos_launch_status_check'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_launch_status_check
      check (launch_status in (
        'planned', 'generating', 'draft', 'ready', 'needs_action',
        'publishing', 'published', 'completed', 'skipped', 'failed', 'replanning'
      ));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'todos_revision_check'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_revision_check check (revision >= 1);
  end if;
end
$$;
alter table public.project_contexts add column if not exists conversation_summary text not null default '';
alter table public.project_contexts add column if not exists memory_facts jsonb not null default '[]'::jsonb;
alter table public.project_contexts add column if not exists pending_agent_requests jsonb not null default '[]'::jsonb;
alter table public.project_contexts add column if not exists agent_action_jobs jsonb not null default '[]'::jsonb;
alter table public.project_contexts add column if not exists artifacts jsonb not null default '[]'::jsonb;
alter table public.project_contexts add column if not exists agent_notifications jsonb not null default '[]'::jsonb;
alter table public.project_contexts add column if not exists last_reflection_at timestamptz;
alter table public.messages add column if not exists context_ref jsonb;
alter table public.messages add column if not exists reply_to_message_ids jsonb not null default '[]'::jsonb;
alter table public.messages add column if not exists lane text;
alter table public.messages add column if not exists agent_job_id text;
alter table public.todos add column if not exists topic_variant_id text;
alter table public.gtm_projects alter column store_version set default 5;

create index if not exists idx_projects_owner on public.gtm_projects(owner_id);
create index if not exists idx_conversations_project on public.conversations(project_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);
create index if not exists idx_todos_project_date on public.todos(project_id, due_date, due_time);
create index if not exists idx_todos_project_channel on public.todos(project_id, channel_id);
create index if not exists idx_todos_project_topic_variant on public.todos(project_id, topic_variant_id);
create index if not exists idx_topics_project_status on public.topics(project_id, status, priority);
create index if not exists idx_topic_variants_project_topic on public.topic_variants(project_id, topic_id);
create index if not exists idx_topic_variants_project_channel on public.topic_variants(project_id, channel_id, status);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_customer on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_sub_id on public.subscriptions(stripe_subscription_id);
create index if not exists idx_stripe_events_status on public.stripe_events(status, created_at);
create index if not exists idx_ai_usage_user_month on public.ai_usage_events(user_id, created_at);
create unique index if not exists idx_ai_usage_request_id
  on public.ai_usage_events(request_id) where request_id is not null;
create index if not exists idx_campaign_jobs_claim
  on public.campaign_jobs(status, next_attempt_at, priority, created_at);
create index if not exists idx_campaign_jobs_project
  on public.campaign_jobs(project_id, created_at desc);
create unique index if not exists idx_campaign_jobs_one_active_per_project
  on public.campaign_jobs(project_id)
  where status in ('queued', 'running');
create index if not exists idx_campaign_jobs_lease
  on public.campaign_jobs(lease_expires_at) where status = 'running';
create index if not exists idx_campaign_job_steps_claim
  on public.campaign_job_steps(job_id, status, sort_order, next_attempt_at);
create index if not exists idx_campaign_job_steps_lease
  on public.campaign_job_steps(lease_expires_at) where status = 'running';

-- Apply updated_at consistently. DROP keeps this script repeatable.
drop trigger if exists app_users_updated_at on public.app_users;
create trigger app_users_updated_at before update on public.app_users
for each row execute function public.set_updated_at();
drop trigger if exists gtm_projects_updated_at on public.gtm_projects;
create trigger gtm_projects_updated_at before update on public.gtm_projects
for each row execute function public.set_updated_at();
drop trigger if exists project_contexts_updated_at on public.project_contexts;
create trigger project_contexts_updated_at before update on public.project_contexts
for each row execute function public.set_updated_at();
drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at before update on public.conversations
for each row execute function public.set_updated_at();
drop trigger if exists messages_updated_at on public.messages;
create trigger messages_updated_at before update on public.messages
for each row execute function public.set_updated_at();
drop trigger if exists market_strategies_updated_at on public.market_strategies;
create trigger market_strategies_updated_at before update on public.market_strategies
for each row execute function public.set_updated_at();
drop trigger if exists channel_strategies_updated_at on public.channel_strategies;
create trigger channel_strategies_updated_at before update on public.channel_strategies
for each row execute function public.set_updated_at();
drop trigger if exists topics_updated_at on public.topics;
create trigger topics_updated_at before update on public.topics
for each row execute function public.set_updated_at();
drop trigger if exists topic_variants_updated_at on public.topic_variants;
create trigger topic_variants_updated_at before update on public.topic_variants
for each row execute function public.set_updated_at();
drop trigger if exists todos_updated_at on public.todos;
create trigger todos_updated_at before update on public.todos
for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_updated_at on public.subscriptions;
drop trigger if exists update_subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
drop trigger if exists stripe_events_updated_at on public.stripe_events;
create trigger stripe_events_updated_at before update on public.stripe_events
for each row execute function public.set_updated_at();
drop trigger if exists campaign_jobs_updated_at on public.campaign_jobs;
create trigger campaign_jobs_updated_at before update on public.campaign_jobs
for each row execute function public.set_updated_at();
drop trigger if exists campaign_job_steps_updated_at on public.campaign_job_steps;
create trigger campaign_job_steps_updated_at before update on public.campaign_job_steps
for each row execute function public.set_updated_at();

-- No browser access: Clerk auth is verified by Next.js, then server-side code
-- uses the Supabase service role. RLS remains enabled as defense in depth.
alter table public.app_users enable row level security;
alter table public.gtm_projects enable row level security;
alter table public.project_contexts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.market_strategies enable row level security;
alter table public.market_strategy_reports enable row level security;
alter table public.channel_strategies enable row level security;
alter table public.project_channels enable row level security;
alter table public.topics enable row level security;
alter table public.topic_variants enable row level security;
alter table public.todos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.campaign_jobs enable row level security;
alter table public.campaign_job_steps enable row level security;

drop policy if exists "Users can view own subscription" on public.subscriptions;
drop policy if exists "Service role can manage subscriptions" on public.subscriptions;

revoke all on public.app_users, public.gtm_projects, public.project_contexts,
  public.conversations, public.messages, public.market_strategies, public.market_strategy_reports,
  public.channel_strategies, public.project_channels, public.topics,
  public.topic_variants, public.todos,
  public.subscriptions, public.stripe_events, public.ai_usage_events,
  public.campaign_jobs, public.campaign_job_steps
  from anon, authenticated;

grant all on public.app_users, public.gtm_projects, public.project_contexts,
  public.conversations, public.messages, public.market_strategies, public.market_strategy_reports,
  public.channel_strategies, public.project_channels, public.topics,
  public.topic_variants, public.todos,
  public.subscriptions, public.stripe_events, public.ai_usage_events,
  public.campaign_jobs, public.campaign_job_steps to service_role;
revoke execute on function public.get_ai_monthly_spend(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_ai_monthly_spend(text, timestamptz) to service_role;

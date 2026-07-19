-- First-class topic library. A topic captures the channel-independent idea;
-- topic_variants capture how that idea is expressed on each channel.

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

alter table public.todos add column if not exists topic_variant_id text;

update public.todos as todo
set topic_variant_id = null
where topic_variant_id is not null
  and not exists (
    select 1
    from public.topic_variants as variant
    where variant.project_id = todo.project_id
      and variant.id = todo.topic_variant_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_topic_variant_fk'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_topic_variant_fk
      foreign key (project_id, topic_variant_id)
      references public.topic_variants(project_id, id);
  end if;
end
$$;

alter table public.gtm_projects alter column store_version set default 5;
update public.gtm_projects set store_version = 5 where store_version < 5;

create index if not exists idx_topics_project_status
  on public.topics(project_id, status, priority);
create index if not exists idx_topic_variants_project_topic
  on public.topic_variants(project_id, topic_id);
create index if not exists idx_topic_variants_project_channel
  on public.topic_variants(project_id, channel_id, status);
create index if not exists idx_todos_project_topic_variant
  on public.todos(project_id, topic_variant_id);

drop trigger if exists topics_updated_at on public.topics;
create trigger topics_updated_at before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists topic_variants_updated_at on public.topic_variants;
create trigger topic_variants_updated_at before update on public.topic_variants
for each row execute function public.set_updated_at();

alter table public.topics enable row level security;
alter table public.topic_variants enable row level security;

revoke all on public.topics, public.topic_variants from anon, authenticated;
grant all on public.topics, public.topic_variants to service_role;

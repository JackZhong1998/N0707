-- Queryable projection fields for the post-purchase 30-day Launch Calendar.
-- The complete Launch state remains canonical in gtm_projects.state_snapshot;
-- these columns make purpose, pillar, task type, lifecycle, and revision
-- available to reporting and operational queries without unpacking JSON.

alter table public.todos add column if not exists purpose text;
alter table public.todos add column if not exists pillar text;
alter table public.todos add column if not exists task_type text;
alter table public.todos
  add column if not exists launch_status text not null default 'planned';
alter table public.todos
  add column if not exists revision integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
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
    select 1
    from pg_constraint
    where conname = 'todos_revision_check'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_revision_check check (revision >= 1);
  end if;
end
$$;

create index if not exists idx_todos_project_launch_status
  on public.todos(project_id, launch_status, due_date);

comment on column public.todos.purpose is
  'Why the task exists in the shared campaign spine.';
comment on column public.todos.pillar is
  'Campaign pillar inherited from the Launch Blueprint.';
comment on column public.todos.task_type is
  'Channel-native execution type such as post, article, or directory submission.';
comment on column public.todos.launch_status is
  'Detailed Launch Calendar lifecycle; status remains the legacy completion projection.';
comment on column public.todos.revision is
  'Task-level revision used by scoped Agent edits.';

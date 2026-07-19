-- NowBuild post tracking migration
-- Safe to run more than once. Existing rows and data are preserved.

alter table public.todos
  add column if not exists tracking_status text not null default 'not_started';

alter table public.todos
  add column if not exists metric_snapshots jsonb not null default '[]'::jsonb;

-- Add the validation constraint only when it is not already present.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_tracking_status_check'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_tracking_status_check
      check (
        tracking_status in (
          'not_started',
          'active',
          'collecting',
          'needs_user',
          'failed',
          'completed'
        )
      );
  end if;
end
$$;

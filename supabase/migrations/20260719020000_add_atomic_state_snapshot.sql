-- Atomic canonical GTM state.
--
-- The normalized tables remain query projections, but a client restore reads
-- this single versioned snapshot. A conditional UPDATE on state_revision can
-- therefore compare-and-swap the complete state without exposing torn writes.

alter table public.gtm_projects
  add column if not exists state_revision bigint not null default 0;

alter table public.gtm_projects
  add column if not exists state_snapshot jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gtm_projects_state_revision_check'
      and conrelid = 'public.gtm_projects'::regclass
  ) then
    alter table public.gtm_projects
      add constraint gtm_projects_state_revision_check
      check (state_revision >= 0);
  end if;
end
$$;

comment on column public.gtm_projects.state_revision is
  'Monotonic compare-and-swap revision for the canonical GTM snapshot.';

comment on column public.gtm_projects.state_snapshot is
  'Canonical bounded GtmStore JSON; normalized tables are non-canonical projections.';

-- Persist the website information and asset candidates collected for each user.
-- The canonical copy remains in state_snapshot; this projection makes the
-- Launch Kit independently queryable for directory automation.
alter table public.gtm_projects
  add column if not exists directory_launch_kit jsonb;

comment on column public.gtm_projects.directory_launch_kit is
  'User-confirmed directory Launch Kit, including public website asset sources and captures.';

update public.gtm_projects
set directory_launch_kit = state_snapshot #> '{launch,directoryLaunchKit}'
where directory_launch_kit is null
  and state_snapshot #> '{launch,directoryLaunchKit}' is not null;

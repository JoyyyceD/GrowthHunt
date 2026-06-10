-- V2-T1: shareable public playbook reports. One per workspace, private by default.
create table if not exists public.scout_reports (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null unique references public.gtm_workspaces(id) on delete cascade,
  slug          text        not null unique,
  enabled       boolean     not null default false,
  view_count    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists scout_reports_slug_idx on public.scout_reports (slug) where enabled;

alter table public.scout_reports enable row level security;
grant all on table public.scout_reports to service_role;
create policy "owner reads own report" on public.scout_reports for select
  using (exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

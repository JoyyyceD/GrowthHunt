-- GTM Workflows — higher abstraction than playbooks (triggers + human gates + artifacts).
create table if not exists public.workflow_runs (
  id                  uuid        primary key default gen_random_uuid(),
  workspace_id        uuid        not null references public.gtm_workspaces(id) on delete cascade,
  workflow_id         text        not null,
  parent_task_id      uuid        references public.gtm_tasks(id) on delete set null,
  status              text        not null default 'pending',
  trigger_kind        text        not null default 'manual',
  current_step        int         not null default 0,
  total_steps         int         not null default 0,
  pause_reason        text,
  pause_payload       jsonb,
  step_log            jsonb       not null default '[]'::jsonb,
  inputs              jsonb       not null default '{}'::jsonb,
  outputs             jsonb       not null default '{}'::jsonb,
  artifacts           jsonb       not null default '[]'::jsonb,
  outcome             text,
  started_at          timestamptz,
  finished_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists workflow_runs_workspace_idx on public.workflow_runs (workspace_id, created_at desc);
create index if not exists workflow_runs_status_idx on public.workflow_runs (status) where status in ('pending','running','awaiting_input');

create table if not exists public.workflow_triggers (
  id                  uuid        primary key default gen_random_uuid(),
  workspace_id        uuid        not null references public.gtm_workspaces(id) on delete cascade,
  workflow_id         text        not null,
  kind                text        not null,
  config              jsonb       not null default '{}'::jsonb,
  enabled             boolean     not null default true,
  last_fired_at       timestamptz,
  created_at          timestamptz not null default now(),
  unique (workspace_id, workflow_id, kind)
);
create index if not exists workflow_triggers_workspace_idx on public.workflow_triggers (workspace_id);

create or replace function public.workflow_runs_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists workflow_runs_set_updated_at on public.workflow_runs;
create trigger workflow_runs_set_updated_at
  before update on public.workflow_runs
  for each row execute function public.workflow_runs_touch_updated_at();

alter table public.workflow_runs     enable row level security;
alter table public.workflow_triggers enable row level security;

grant all on table public.workflow_runs     to service_role;
grant all on table public.workflow_triggers to service_role;

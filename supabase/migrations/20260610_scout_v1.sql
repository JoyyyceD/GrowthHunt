-- Scout v1 — additive only: artifacts (knowledge base docs), task runs, API usage metering.
-- Rule: no changes to existing tables (decision 4.3).

-- Knowledge base documents delivered by Scout (7 onboarding docs + future).
create table if not exists public.agent_artifacts (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.gtm_workspaces(id) on delete cascade,
  slug          text        not null,
  title         text        not null,
  kind          text        not null default 'doc',
  content_md    text        not null,
  summary       text,
  rev           int         not null default 1,
  created_by    text        not null default 'agent',
  task_id       uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index if not exists agent_artifacts_workspace_idx on public.agent_artifacts (workspace_id, updated_at desc);

-- Snapshot of each revision before an update (rev history, no diff/rollback in v1).
create table if not exists public.agent_artifact_revisions (
  artifact_id  uuid        not null references public.agent_artifacts(id) on delete cascade,
  rev          int         not null,
  content_md   text        not null,
  created_at   timestamptz not null default now(),
  primary key (artifact_id, rev)
);

-- Scout long-running tasks (onboarding pipeline). Progress drives SSE replay on reconnect.
create table if not exists public.scout_tasks (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.gtm_workspaces(id) on delete cascade,
  kind          text        not null default 'onboarding',
  status        text        not null default 'queued',
  progress      jsonb       not null default '[]'::jsonb,
  result        jsonb,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists scout_tasks_workspace_idx on public.scout_tasks (workspace_id, created_at desc);

-- Per-call API usage metering (limits now, credits later).
create table if not exists public.api_usage (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        references public.gtm_workspaces(id) on delete set null,
  provider      text        not null,
  model         text,
  kind          text,
  tokens_in     int         not null default 0,
  tokens_out    int         not null default 0,
  cost_usd      numeric(10,6) not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists api_usage_workspace_day_idx on public.api_usage (workspace_id, created_at desc);

alter table public.agent_artifacts enable row level security;
alter table public.agent_artifact_revisions enable row level security;
alter table public.scout_tasks enable row level security;
alter table public.api_usage enable row level security;

grant all on table public.agent_artifacts to service_role;
grant all on table public.agent_artifact_revisions to service_role;
grant all on table public.scout_tasks to service_role;
grant all on table public.api_usage to service_role;

-- Owners may read their own workspace's artifacts/tasks from the browser; writes stay server-side.
create policy "owner reads artifacts" on public.agent_artifacts for select
  using (exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "owner reads revisions" on public.agent_artifact_revisions for select
  using (exists (
    select 1 from public.agent_artifacts a
    join public.gtm_workspaces w on w.id = a.workspace_id
    where a.id = artifact_id and w.owner_id = auth.uid()
  ));
create policy "owner reads tasks" on public.scout_tasks for select
  using (exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- (amendment, same day) Scout's pre-approval queue state. Additive widen:
-- cron only selects 'scheduled', existing rows unaffected.
alter table public.gtm_scheduled_posts drop constraint gtm_scheduled_posts_status_check;
alter table public.gtm_scheduled_posts add constraint gtm_scheduled_posts_status_check
  check (status = any (array['draft'::text, 'proposed'::text, 'scheduled'::text, 'posted'::text, 'failed'::text, 'canceled'::text]));

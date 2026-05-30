-- Postiz integration — multi-platform scheduling engine.
--
-- Posture: Postiz (self-hosted or cloud) owns the actual scheduling queue and
-- platform OAuth. GrowthHunt keeps a thin MIRROR so Mission Control, Post ROI
-- and the scheduler UI can reason about what's queued / sent without round-
-- tripping Postiz on every render.
--
--   postiz_connections   — per-workspace API credentials (url + key).
--   postiz_integrations  — cached list of the user's connected channels.
--   gtm_scheduled_posts  — local mirror of every post we hand to Postiz.

-- ── per-workspace Postiz credentials ────────────────────────────────────────
create table if not exists public.postiz_connections (
  workspace_id  uuid        primary key references public.gtm_workspaces(id) on delete cascade,
  api_url       text        not null default 'https://api.postiz.com/public/v1',
  api_key       text        not null,
  label         text,                                   -- optional human note
  last_synced_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists postiz_connections_updated_at on public.postiz_connections;
create trigger postiz_connections_updated_at
  before update on public.postiz_connections
  for each row execute function public.set_updated_at();

-- ── cached channels (Postiz "integrations") ─────────────────────────────────
create table if not exists public.postiz_integrations (
  id             uuid        primary key default gen_random_uuid(),
  workspace_id   uuid        not null references public.gtm_workspaces(id) on delete cascade,
  integration_id text        not null,                  -- Postiz channel id
  platform       text        not null,                  -- 'x' | 'linkedin' | 'reddit' | ...
  name           text,                                  -- display name / handle
  picture        text,                                  -- avatar url
  disabled       boolean     not null default false,
  raw            jsonb,                                  -- full Postiz payload
  refreshed_at   timestamptz not null default now(),
  unique (workspace_id, integration_id)
);
create index if not exists postiz_integrations_ws_idx
  on public.postiz_integrations (workspace_id, platform);

-- ── local mirror of scheduled / sent posts ──────────────────────────────────
create table if not exists public.gtm_scheduled_posts (
  id               uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references public.gtm_workspaces(id) on delete cascade,
  -- Postiz side
  postiz_post_id   text,                                -- id returned by POST /posts
  integration_id   text        not null,
  platform         text        not null,
  -- content
  content          text        not null,
  media            jsonb       not null default '[]'::jsonb,  -- [{id, path}]
  -- scheduling
  type             text        not null default 'schedule' check (type in ('schedule','now','draft')),
  scheduled_for    timestamptz,                         -- null for 'now'
  -- lifecycle: queued -> scheduled -> posted | failed
  status           text        not null default 'scheduled'
                     check (status in ('draft','scheduled','posted','failed','canceled')),
  posted_at        timestamptz,
  external_post_id text,                                -- platform's own post id once known
  error            text,
  -- provenance
  source           text        not null default 'chat', -- 'chat' | 'scheduler_ui' | 'workflow'
  conversation_id  uuid        references public.gtm_conversations(id) on delete set null,
  task_id          uuid        references public.gtm_tasks(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists gtm_scheduled_posts_ws_idx
  on public.gtm_scheduled_posts (workspace_id, scheduled_for desc);
create index if not exists gtm_scheduled_posts_due_idx
  on public.gtm_scheduled_posts (scheduled_for)
  where status = 'scheduled';

drop trigger if exists gtm_scheduled_posts_updated_at on public.gtm_scheduled_posts;
create trigger gtm_scheduled_posts_updated_at
  before update on public.gtm_scheduled_posts
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────--
alter table public.postiz_connections   enable row level security;
alter table public.postiz_integrations  enable row level security;
alter table public.gtm_scheduled_posts  enable row level security;

-- Owner-scoped read/write via the parent workspace.
drop policy if exists postiz_conn_owner on public.postiz_connections;
create policy postiz_conn_owner on public.postiz_connections
  for all using (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

drop policy if exists postiz_integ_owner on public.postiz_integrations;
create policy postiz_integ_owner on public.postiz_integrations
  for all using (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

drop policy if exists sched_posts_owner on public.gtm_scheduled_posts;
create policy sched_posts_owner on public.gtm_scheduled_posts
  for all using (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

grant all on table public.postiz_connections  to authenticated, service_role;
grant all on table public.postiz_integrations to authenticated, service_role;
grant all on table public.gtm_scheduled_posts to authenticated, service_role;

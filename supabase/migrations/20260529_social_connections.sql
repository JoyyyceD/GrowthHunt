-- Native multi-platform social connections (self-built provider adapters, no Postiz code).
-- One row per connected account (workspace x platform x account).
-- TODO(security): tokens are plaintext for private beta — encrypt at rest via
-- Supabase Vault / pgsodium before general release (same posture as viralx_x_credentials).

create table if not exists public.social_connections (
  id             uuid        primary key default gen_random_uuid(),
  workspace_id   uuid        not null references public.gtm_workspaces(id) on delete cascade,
  platform       text        not null check (platform in ('x','linkedin','reddit')),
  account_id     text,
  account_handle text,
  access_token   text        not null,
  refresh_token  text,
  expires_at     timestamptz,
  scopes         text,
  meta           jsonb       not null default '{}'::jsonb,
  needs_reconnect boolean    not null default false,
  reconnect_reason text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (workspace_id, platform, account_id)
);
create index if not exists social_connections_ws_idx
  on public.social_connections (workspace_id, platform);

drop trigger if exists social_connections_updated_at on public.social_connections;
create trigger social_connections_updated_at
  before update on public.social_connections
  for each row execute function public.set_updated_at();

alter table public.social_connections enable row level security;

drop policy if exists social_conn_owner on public.social_connections;
create policy social_conn_owner on public.social_connections
  for all using (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.gtm_workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

grant all on table public.social_connections to authenticated, service_role;

-- Distinguish how a queued post should be published.
alter table public.gtm_scheduled_posts
  add column if not exists provider text not null default 'postiz' check (provider in ('postiz','native')),
  add column if not exists retry_count int not null default 0;

-- Per-workspace MCP API key (for external AI agents to authenticate).
alter table public.gtm_workspaces
  add column if not exists mcp_api_key text;
create unique index if not exists gtm_workspaces_mcp_api_key_idx
  on public.gtm_workspaces (mcp_api_key) where mcp_api_key is not null;

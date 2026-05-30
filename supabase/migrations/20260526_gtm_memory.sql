-- Letta-style 3-layer memory for the GTM orchestrator.
--
--   1. CORE — small always-injected workspace block (founder bio + open goal +
--      pinned facts). Capped at ~4 KB to keep the prompt tight. One row per
--      workspace, with N labelled sections.
--   2. ARCHIVAL — long-form facts the agent decides to remember across
--      sessions. Indexed by 1536-d embedding for similarity search.
--   3. RECALL — the existing gtm_messages table already serves as recall
--      memory (full conversation history), so no new table here.

create extension if not exists vector;

-- Core memory: small, structured, always in the prompt.
create table if not exists public.gtm_memory_core (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.gtm_workspaces(id) on delete cascade,
  -- Section label so the agent can address an individual block, e.g.
  -- "founder", "current_goal", "user_preferences", "do_not_do".
  label         text        not null,
  content       text        not null default '',
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (workspace_id, label)
);
create index if not exists gtm_memory_core_workspace_idx
  on public.gtm_memory_core (workspace_id, label);

create or replace function public.gtm_memory_core_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists gtm_memory_core_set_updated_at on public.gtm_memory_core;
create trigger gtm_memory_core_set_updated_at
  before update on public.gtm_memory_core
  for each row execute function public.gtm_memory_core_touch();

-- Archival memory: long-form notes the agent retrieves on demand by similarity.
create table if not exists public.gtm_memory_archival (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.gtm_workspaces(id) on delete cascade,
  content       text        not null,
  -- Embedding dim: 1536 matches OpenAI text-embedding-3-small. Nullable so
  -- inserts don't block when the embedding provider is briefly down — the
  -- search RPC just skips rows without an embedding.
  embedding     vector(1536),
  source        text,                                -- 'agent' | 'user' | 'task'
  tags          text[]      not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists gtm_memory_archival_workspace_idx
  on public.gtm_memory_archival (workspace_id, created_at desc);

-- IVFFlat index for cosine similarity. Re-build with higher `lists` once the
-- table grows past ~10k rows.
create index if not exists gtm_memory_archival_embedding_idx
  on public.gtm_memory_archival using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC: similarity search scoped to a workspace.
create or replace function public.match_gtm_memory(
  query_embedding vector(1536),
  match_workspace uuid,
  match_count     int default 5,
  match_threshold float default 0.0
)
returns table (
  id         uuid,
  content    text,
  source     text,
  tags       text[],
  created_at timestamptz,
  similarity float
)
language sql stable as $$
  select
    m.id, m.content, m.source, m.tags, m.created_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.gtm_memory_archival m
  where m.workspace_id = match_workspace
    and m.embedding is not null
    and (1 - (m.embedding <=> query_embedding)) >= match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.gtm_memory_core     enable row level security;
alter table public.gtm_memory_archival enable row level security;

grant all on table public.gtm_memory_core     to service_role;
grant all on table public.gtm_memory_archival to service_role;
grant execute on function public.match_gtm_memory(vector, uuid, int, float) to service_role;

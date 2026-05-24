-- GTM Workspace — the shared brain every agent reads.
-- One per product; user can own multiple. Owner-scoped via RLS so
-- agents server-side can read with the service role, while end-user
-- mutations go through createServerClient() and respect ownership.

create table if not exists public.gtm_workspaces (
  id              uuid        primary key default gen_random_uuid(),
  owner_id        uuid        references public.profiles(id) on delete cascade,
  -- Core product identity
  name            text        not null,
  url             text        not null,
  one_liner       text,                -- "X for Y" elevator pitch
  -- Audience
  icp_summary     text,                -- 1-2 sentences
  icp_segments    jsonb       not null default '[]'::jsonb,   -- [{name, size_hint, channels[], jtbd, pains[]}]
  -- Positioning
  positioning     text,                -- distilled positioning statement
  key_messages    jsonb       not null default '[]'::jsonb,   -- string[]
  competitors     jsonb       not null default '[]'::jsonb,   -- [{name, url, note}]
  -- Voice profile (filled by #10 Founder Voice Trainer)
  voice           jsonb,               -- {tone, vocabulary[], sentence_avg, emoji, formatting, sample_passages[]}
  voice_handle    text,                -- e.g. "growthhuntai" (X handle source for voice training)
  -- Display / branding
  brand_color     text,                -- hex
  emoji           text,                -- single brand emoji
  -- Metadata
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists gtm_workspaces_owner_idx on public.gtm_workspaces (owner_id);

create or replace function public.gtm_workspaces_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gtm_workspaces_set_updated_at on public.gtm_workspaces;
create trigger gtm_workspaces_set_updated_at
  before update on public.gtm_workspaces
  for each row execute function public.gtm_workspaces_touch_updated_at();

alter table public.gtm_workspaces enable row level security;

drop policy if exists workspaces_owner_read on public.gtm_workspaces;
create policy workspaces_owner_read on public.gtm_workspaces
  for select using (auth.uid() = owner_id);

drop policy if exists workspaces_owner_write on public.gtm_workspaces;
create policy workspaces_owner_write on public.gtm_workspaces
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

grant all on table public.gtm_workspaces to authenticated, service_role;

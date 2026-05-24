-- Tables for the agent feature pack: creator outreach drafts, community
-- radar leads, agent task runs. All workspace-scoped; service role only
-- (workspace ownership is enforced at the route layer).

-- ── outreach_drafts ── per-creator drafted message, awaiting send/skip
create table if not exists public.outreach_drafts (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  channel         text        not null,                    -- x_dm | email | linkedin
  target_handle   text,                                    -- @handle (for X / LinkedIn)
  target_email    text,                                    -- email (for cold email)
  target_name     text,
  target_url      text,                                    -- profile or bio link
  audience_score  int         not null default 0,          -- 0..100 buyer-trust signal
  reasoning       text,                                    -- why this creator
  message_subject text,                                    -- for email only
  message_body    text        not null,                    -- the drafted pitch
  status          text        not null default 'queued',   -- queued|sent|skipped|replied|bounced
  sent_at         timestamptz,
  reply_at        timestamptz,
  reply_text      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists outreach_drafts_workspace_idx on public.outreach_drafts (workspace_id, created_at desc);
create index if not exists outreach_drafts_status_idx    on public.outreach_drafts (status);

-- ── radar_leads ── community-radar matches (Reddit + HN posts)
create table if not exists public.radar_leads (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  source          text        not null,                    -- reddit | hackernews
  source_id       text        not null,                    -- platform post id
  url             text        not null,
  title           text        not null,
  excerpt         text,
  author          text,
  posted_at       timestamptz,
  intent          text,                                    -- asking | complaining | discussing | comparing
  relevance       int         not null default 0,          -- 0..100
  reasoning       text,
  reply_draft     text,
  status          text        not null default 'new',      -- new|saved|dismissed|replied
  created_at      timestamptz not null default now(),
  unique (workspace_id, source, source_id)
);
create index if not exists radar_leads_workspace_idx on public.radar_leads (workspace_id, created_at desc);
create index if not exists radar_leads_relevance_idx on public.radar_leads (workspace_id, relevance desc);

-- ── agent_runs ── audit log of every agent invocation per workspace
create table if not exists public.agent_runs (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        references public.gtm_workspaces(id) on delete cascade,
  agent           text        not null,                    -- icp | voice | landing | creator | radar | …
  status          text        not null default 'ok',
  duration_ms     int,
  input_summary   text,
  output_summary  text,
  error           text,
  created_at      timestamptz not null default now()
);
create index if not exists agent_runs_workspace_idx on public.agent_runs (workspace_id, created_at desc);

create or replace function public.outreach_drafts_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists outreach_drafts_set_updated_at on public.outreach_drafts;
create trigger outreach_drafts_set_updated_at
  before update on public.outreach_drafts
  for each row execute function public.outreach_drafts_touch_updated_at();

alter table public.outreach_drafts enable row level security;
alter table public.radar_leads     enable row level security;
alter table public.agent_runs      enable row level security;

grant all on table public.outreach_drafts to service_role;
grant all on table public.radar_leads     to service_role;
grant all on table public.agent_runs      to service_role;

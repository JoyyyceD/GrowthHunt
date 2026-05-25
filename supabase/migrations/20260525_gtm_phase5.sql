-- Phase 5 — self-post ROI loop + trend digest + launch orchestrator + video coach

-- ── self_posts ── snapshots of the workspace owner's own posts, scored by template
create table if not exists public.self_posts (
  id              text        primary key,
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  handle          text        not null,
  text            text        not null,
  url             text        not null,
  created_at_x    timestamptz not null,
  like_count      int         not null default 0,
  retweet_count   int         not null default 0,
  reply_count     int         not null default 0,
  view_count      bigint      not null default 0,
  bookmark_count  int         not null default 0,
  is_rt           boolean     not null default false,
  is_template     boolean     not null default false,
  template_skeleton text,
  engagement_score real        not null default 0,
  ingested_at     timestamptz not null default now()
);
create index if not exists self_posts_workspace_idx on public.self_posts (workspace_id, created_at_x desc);
create index if not exists self_posts_template_idx  on public.self_posts (workspace_id, template_skeleton) where is_template;
create index if not exists self_posts_engagement_idx on public.self_posts (workspace_id, engagement_score desc);

create table if not exists public.self_post_digests (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  week_starting   date        not null,
  posts_count     int         not null,
  top_templates   jsonb       not null default '[]'::jsonb,
  bottom_templates jsonb       not null default '[]'::jsonb,
  recommendations  jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  unique (workspace_id, week_starting)
);
create index if not exists self_post_digests_workspace_idx on public.self_post_digests (workspace_id, week_starting desc);

create table if not exists public.trend_candidates (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  source          text        not null,
  source_handle   text,
  source_tweet_id text,
  url             text,
  context_text    text        not null,
  drafted_post    text        not null,
  template_used   text,
  relevance       int         not null default 0,
  reasoning       text,
  status          text        not null default 'new',
  posted_tweet_id text,
  created_at      timestamptz not null default now()
);
create index if not exists trend_candidates_workspace_idx on public.trend_candidates (workspace_id, created_at desc);
create index if not exists trend_candidates_status_idx on public.trend_candidates (workspace_id, status);

create table if not exists public.launch_campaigns (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  name            text        not null,
  product_url     text        not null,
  tagline         text,
  launch_at       timestamptz not null,
  platforms       jsonb       not null default '[]'::jsonb,
  checklist       jsonb       not null default '[]'::jsonb,
  copy            jsonb       not null default '{}'::jsonb,
  status          text        not null default 'planning',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists launch_campaigns_workspace_idx on public.launch_campaigns (workspace_id, launch_at desc);

create table if not exists public.video_scripts (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  scenario        text        not null,
  duration_sec    int         not null default 60,
  title           text        not null,
  shot_list       jsonb       not null default '[]'::jsonb,
  checklist       jsonb       not null default '[]'::jsonb,
  external_tools  jsonb       not null default '[]'::jsonb,
  pre_upload      jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists video_scripts_workspace_idx on public.video_scripts (workspace_id, created_at desc);

create or replace function public.launch_campaigns_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists launch_campaigns_set_updated_at on public.launch_campaigns;
create trigger launch_campaigns_set_updated_at
  before update on public.launch_campaigns
  for each row execute function public.launch_campaigns_touch_updated_at();

alter table public.self_posts         enable row level security;
alter table public.self_post_digests  enable row level security;
alter table public.trend_candidates   enable row level security;
alter table public.launch_campaigns   enable row level security;
alter table public.video_scripts      enable row level security;

grant all on table public.self_posts        to service_role;
grant all on table public.self_post_digests to service_role;
grant all on table public.trend_candidates  to service_role;
grant all on table public.launch_campaigns  to service_role;
grant all on table public.video_scripts     to service_role;

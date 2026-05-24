-- Distribution, A/B Lab, Competitor Watch tables + drafts scheduling.

-- Add scheduling to outreach_drafts (creator + cold email both use it).
alter table public.outreach_drafts
  add column if not exists scheduled_for timestamptz,
  add column if not exists send_via      text default 'manual',
  add column if not exists last_remind_at timestamptz;
create index if not exists outreach_drafts_due_idx
  on public.outreach_drafts (scheduled_for)
  where status = 'queued';

-- ── distribution_posts ── one canonical post → many platform variants
create table if not exists public.distribution_posts (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  topic           text        not null,
  source_url      text,
  variants        jsonb       not null default '{}'::jsonb,        -- {x: {body, threadParts[]}, linkedin: {...}, ...}
  cadence         jsonb       not null default '[]'::jsonb,        -- [{platform, post_at_offset_hours, note}]
  status          text        not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists distribution_posts_workspace_idx on public.distribution_posts (workspace_id, created_at desc);

-- ── ab_tests + ab_clicks ── tracked-URL A/B
create table if not exists public.ab_tests (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  name            text        not null,
  target_url      text        not null,
  variants        jsonb       not null default '[]'::jsonb,        -- [{key:'A', copy, clicks?:0}]
  total_clicks    int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ab_tests_workspace_idx on public.ab_tests (workspace_id, created_at desc);

create table if not exists public.ab_clicks (
  id              bigserial   primary key,
  test_id         uuid        not null references public.ab_tests(id) on delete cascade,
  variant_key     text        not null,
  ip_hash         text,
  user_agent      text,
  referrer        text,
  clicked_at      timestamptz not null default now()
);
create index if not exists ab_clicks_test_idx on public.ab_clicks (test_id, variant_key);

-- ── competitor_snapshots ── periodic page snapshots for diffing
create table if not exists public.competitor_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  competitor_url  text        not null,
  url_hash        text        not null,
  title           text,
  description     text,
  body_excerpt    text,
  pricing_block   text,
  hash            text        not null,
  created_at      timestamptz not null default now()
);
create index if not exists competitor_snapshots_workspace_idx on public.competitor_snapshots (workspace_id, competitor_url, created_at desc);

-- ── competitor_diffs ── alerts derived from snapshot comparison
create table if not exists public.competitor_diffs (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  competitor_url  text        not null,
  kind            text        not null,                            -- pricing | copy | headline | new_section
  summary         text        not null,
  before_excerpt  text,
  after_excerpt  text,
  detected_at     timestamptz not null default now(),
  acknowledged    boolean     not null default false
);
create index if not exists competitor_diffs_workspace_idx on public.competitor_diffs (workspace_id, detected_at desc);

create or replace function public.distribution_posts_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists distribution_posts_set_updated_at on public.distribution_posts;
create trigger distribution_posts_set_updated_at
  before update on public.distribution_posts
  for each row execute function public.distribution_posts_touch_updated_at();

create or replace function public.ab_tests_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists ab_tests_set_updated_at on public.ab_tests;
create trigger ab_tests_set_updated_at
  before update on public.ab_tests
  for each row execute function public.ab_tests_touch_updated_at();

-- RLS — service role only (route-layer ownership checks)
alter table public.distribution_posts   enable row level security;
alter table public.ab_tests             enable row level security;
alter table public.ab_clicks            enable row level security;
alter table public.competitor_snapshots enable row level security;
alter table public.competitor_diffs     enable row level security;

grant all on table public.distribution_posts   to service_role;
grant all on table public.ab_tests             to service_role;
grant all on table public.ab_clicks            to service_role;
grant usage, select on sequence public.ab_clicks_id_seq to service_role;
grant all on table public.competitor_snapshots to service_role;
grant all on table public.competitor_diffs     to service_role;

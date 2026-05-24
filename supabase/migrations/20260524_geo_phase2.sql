-- GrowthHunt GEO Phase 2 — live citations, weekly monitoring,
-- competitor audits, site-wide crawl, and apply-fixes PR tracking.
--
-- All tables namespaced geo_*; service-role-only (no anon access).

-- ── geo_citation_runs ── one row per live-citation check (multiple engines × queries)
create table if not exists public.geo_citation_runs (
  id          uuid        primary key default gen_random_uuid(),
  url         text        not null,
  url_hash    text        not null,
  brand       text        not null,
  domain      text        not null,
  queries     jsonb       not null,        -- string[]
  results     jsonb       not null,        -- EngineCitationResult[][]
  summary     jsonb       not null,        -- per-engine + overall citation rate
  created_at  timestamptz not null default now()
);
create index if not exists geo_citation_runs_url_hash_idx on public.geo_citation_runs (url_hash, created_at desc);

-- ── geo_tracked_urls ── weekly re-audit subscriptions
create table if not exists public.geo_tracked_urls (
  id            uuid        primary key default gen_random_uuid(),
  url           text        not null,
  url_hash      text        not null,
  email         text        not null,
  last_score    int,                          -- score from most recent successful audit
  last_run_at   timestamptz,
  next_run_at   timestamptz not null default now(),  -- when the cron should pick it up
  paused        boolean     not null default false,
  created_at    timestamptz not null default now(),
  unique (url_hash, email)
);
create index if not exists geo_tracked_urls_next_run_idx on public.geo_tracked_urls (next_run_at) where paused = false;

-- ── geo_snapshots ── weekly historical score samples (for diffs + sparkline)
create table if not exists public.geo_snapshots (
  id             uuid        primary key default gen_random_uuid(),
  url_hash       text        not null,
  overall_score  int         not null,
  rubric_version text        not null,
  dim_scores     jsonb       not null,        -- {dim_id: percent}
  created_at     timestamptz not null default now()
);
create index if not exists geo_snapshots_url_idx on public.geo_snapshots (url_hash, created_at desc);

-- ── geo_site_audits ── results of crawling a domain's sitemap and auditing N URLs
create table if not exists public.geo_site_audits (
  id            uuid        primary key default gen_random_uuid(),
  domain        text        not null,
  sitemap_url   text        not null,
  status        text        not null default 'running',  -- running|done|error
  total_urls    int         not null default 0,
  audited_urls  int         not null default 0,
  pages         jsonb       not null default '[]'::jsonb, -- [{url, score, dims, error?}]
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists geo_site_audits_domain_idx on public.geo_site_audits (domain, created_at desc);

-- ── geo_pr_requests ── audit log of apply-fixes PR attempts
create table if not exists public.geo_pr_requests (
  id            uuid        primary key default gen_random_uuid(),
  url           text        not null,
  repo          text        not null,        -- owner/name
  branch        text        not null,
  pr_url        text,
  status        text        not null default 'pending', -- pending|opened|error
  error         text,
  changes       jsonb       not null default '[]'::jsonb, -- summary of files patched
  created_at    timestamptz not null default now()
);

-- RLS — lock down, service role only.
alter table public.geo_citation_runs enable row level security;
alter table public.geo_tracked_urls  enable row level security;
alter table public.geo_snapshots     enable row level security;
alter table public.geo_site_audits   enable row level security;
alter table public.geo_pr_requests   enable row level security;

grant all on table public.geo_citation_runs to service_role;
grant all on table public.geo_tracked_urls  to service_role;
grant all on table public.geo_snapshots     to service_role;
grant all on table public.geo_site_audits   to service_role;
grant all on table public.geo_pr_requests   to service_role;

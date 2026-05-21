-- GrowthHunt GEO — audit engine schema
-- All tables namespaced with the geo_ prefix. Written exclusively by the
-- service role (the audit API uses the admin client); no anon access.

-- ── geo_audits ── 24h URL audit cache
create table if not exists public.geo_audits (
  url_hash       text        primary key,
  url            text        not null,
  overall_score  int         not null,
  rubric_version text        not null,
  result         jsonb       not null,
  fetched_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);
create index if not exists geo_audits_expires_idx on public.geo_audits (expires_at);

-- ── geo_usage ── per-day rate limiting, keyed by ip-hash or email
create table if not exists public.geo_usage (
  key   text not null,
  day   date not null,
  count int  not null default 0 check (count >= 0),
  primary key (key, day)
);

-- ── geo_subscribers ── captured emails (web form / over-limit unlock / pro waitlist)
create table if not exists public.geo_subscribers (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  source     text        not null,
  created_at timestamptz not null default now(),
  unique (email, source)
);

-- ── geo_shares ── public share-page snapshots
create table if not exists public.geo_shares (
  hash       text        primary key,
  url        text        not null,
  result     jsonb       not null,
  created_at timestamptz not null default now()
);

-- RLS: lock every table; only the service role touches them.
alter table public.geo_audits      enable row level security;
alter table public.geo_usage       enable row level security;
alter table public.geo_subscribers enable row level security;
alter table public.geo_shares      enable row level security;

grant all on table public.geo_audits      to service_role;
grant all on table public.geo_usage       to service_role;
grant all on table public.geo_subscribers to service_role;
grant all on table public.geo_shares      to service_role;

-- Atomic per-day usage increment; returns the new count for the key/day.
create or replace function public.geo_increment_usage(p_key text, p_day date)
returns int language sql security definer as $$
  insert into public.geo_usage (key, day, count)
  values (p_key, p_day, 1)
  on conflict (key, day)
  do update set count = geo_usage.count + 1
  returning count;
$$;

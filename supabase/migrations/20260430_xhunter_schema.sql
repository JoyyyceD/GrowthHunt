-- Xhunter schema (Phase A — read-only Lab)
-- Run in Supabase Studio → SQL Editor (or supabase db push).
-- Idempotent where possible.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles.tier — free | paid (default free)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists tier text not null default 'free'
    check (tier in ('free', 'paid'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. xhunter_accounts — one row per Twitter handle (lowercase)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.xhunter_accounts (
  handle           text primary key,                              -- lowercase @username
  account_type     text not null check (account_type in ('official','founder')),
  company          text not null,
  category         text not null,                                 -- ai-coding | ai-agent | hardware | ...
  display_label    text not null,                                 -- "Founder of Replit"
  stage            text,
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists xhunter_accounts_category_idx on public.xhunter_accounts (category);
create index if not exists xhunter_accounts_type_idx     on public.xhunter_accounts (account_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. xhunter_tweets — flat tweet table, joined to accounts via handle
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.xhunter_tweets (
  id                text primary key,                             -- X tweet id (string — JS bigint overflow)
  handle            text not null references public.xhunter_accounts(handle) on delete cascade,
  text              text not null,
  url               text not null,
  created_at_x      timestamptz not null,
  like_count        integer not null default 0,
  retweet_count     integer not null default 0,
  reply_count       integer not null default 0,
  view_count        bigint   not null default 0,
  bookmark_count    integer  not null default 0,
  is_rt             boolean  not null default false,
  media_url         text,                                         -- first media URL (twimg.com)
  author_name       text,
  author_avatar     text,
  author_followers  integer,
  is_blue_verified  boolean  not null default false,
  tags              text[]   not null default '{}',               -- merged regex+LLM tags
  ingested_at       timestamptz not null default now()
);

create index if not exists xhunter_tweets_handle_idx        on public.xhunter_tweets (handle);
create index if not exists xhunter_tweets_likes_idx         on public.xhunter_tweets (like_count desc);
create index if not exists xhunter_tweets_views_idx         on public.xhunter_tweets (view_count desc);
create index if not exists xhunter_tweets_bookmarks_idx     on public.xhunter_tweets (bookmark_count desc);
create index if not exists xhunter_tweets_created_idx       on public.xhunter_tweets (created_at_x desc);
create index if not exists xhunter_tweets_tags_idx          on public.xhunter_tweets using gin (tags);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — public read, no public write (writes only via service_role)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.xhunter_accounts enable row level security;
alter table public.xhunter_tweets   enable row level security;

drop policy if exists "xhunter_accounts_public_read" on public.xhunter_accounts;
create policy "xhunter_accounts_public_read"
  on public.xhunter_accounts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "xhunter_tweets_public_read" on public.xhunter_tweets;
create policy "xhunter_tweets_public_read"
  on public.xhunter_tweets
  for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated → only service_role can write.

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Grants — required when tables are created via Management API
-- ─────────────────────────────────────────────────────────────────────────────
grant all privileges on table public.xhunter_accounts to service_role, postgres;
grant all privileges on table public.xhunter_tweets   to service_role, postgres;
grant select on table public.xhunter_accounts to anon, authenticated;
grant select on table public.xhunter_tweets   to anon, authenticated;

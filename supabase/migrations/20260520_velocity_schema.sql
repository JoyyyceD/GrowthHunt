-- Velocity tracker schema — powers /velocity
-- Three public leaderboards: fastest-growing GitHub repos, fastest-growing
-- AI-founder X accounts, and most viral AI products.
-- Refreshed weekly by /api/velocity/cron. Idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. velocity_github_repos — current repo state, refreshed weekly by cron.
--    stars_prev holds the previous run's star count so the page can show a
--    true week-over-week delta once two runs have completed.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.velocity_github_repos (
  id                text primary key,             -- owner/name, lowercased
  full_name         text not null,                -- original-case owner/name
  name              text not null,
  owner             text not null,
  owner_avatar      text,
  owner_url         text,
  description       text,
  language          text,
  topics            text[]   not null default '{}',
  html_url          text not null,
  homepage          text,
  stars             integer  not null default 0,
  forks             integer  not null default 0,
  open_issues       integer  not null default 0,
  stars_prev        integer,                      -- star count at previous cron run
  repo_created_at   timestamptz not null,
  repo_pushed_at    timestamptz,
  is_ai             boolean  not null default false,
  first_tracked_at  timestamptz not null default now(),
  prev_synced_at    timestamptz,
  synced_at         timestamptz not null default now()
);

create index if not exists velocity_github_repos_stars_idx   on public.velocity_github_repos (stars desc);
create index if not exists velocity_github_repos_created_idx on public.velocity_github_repos (repo_created_at desc);
create index if not exists velocity_github_repos_ai_idx      on public.velocity_github_repos (is_ai);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. velocity_x_accounts — weekly follower snapshot per AI-founder handle.
--    Follower counts are sourced from xhunter_tweets (kept fresh by the viralx
--    daily ingest cron); this table only stores the weekly snapshot + previous
--    snapshot so the page can compute a real follower-growth delta.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.velocity_x_accounts (
  handle            text primary key,
  display_name      text,
  avatar            text,
  company           text,
  category          text,
  account_type      text,
  display_label     text,
  is_blue_verified  boolean  not null default false,
  followers         integer  not null default 0,
  followers_prev    integer,
  first_tracked_at  timestamptz not null default now(),
  prev_synced_at    timestamptz,
  synced_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — public read, writes only via service_role.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.velocity_github_repos enable row level security;
alter table public.velocity_x_accounts   enable row level security;

drop policy if exists "velocity_github_repos_public_read" on public.velocity_github_repos;
create policy "velocity_github_repos_public_read"
  on public.velocity_github_repos for select to anon, authenticated using (true);

drop policy if exists "velocity_x_accounts_public_read" on public.velocity_x_accounts;
create policy "velocity_x_accounts_public_read"
  on public.velocity_x_accounts for select to anon, authenticated using (true);

grant all privileges on table public.velocity_github_repos to service_role, postgres;
grant all privileges on table public.velocity_x_accounts   to service_role, postgres;
grant select on table public.velocity_github_repos to anon, authenticated;
grant select on table public.velocity_x_accounts   to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. velocity_x_source_v — latest follower count per handle from xhunter data.
--    Consumed by the cron's follower-snapshot job.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.velocity_x_source_v
with (security_invoker = true) as
select distinct on (t.handle)
  t.handle,
  t.author_followers as followers,
  t.author_name      as display_name,
  t.author_avatar    as avatar,
  t.is_blue_verified,
  a.company,
  a.category,
  a.account_type,
  a.display_label
from public.xhunter_tweets t
join public.xhunter_accounts a on a.handle = t.handle
where t.author_followers is not null
order by t.handle, t.created_at_x desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. velocity_builders_v — AI founders with live 30-day engagement momentum.
--    followers / followers_prev come from the weekly snapshot; momentum is
--    computed live from the last 30 days of tweets.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.velocity_builders_v
with (security_invoker = true) as
select
  va.handle,
  va.display_name,
  va.avatar,
  va.company,
  va.category,
  va.account_type,
  va.display_label,
  va.is_blue_verified,
  va.followers,
  va.followers_prev,
  va.synced_at,
  va.prev_synced_at,
  coalesce(eng.momentum_30d, 0) as momentum_30d,
  coalesce(eng.tweets_30d, 0)   as tweets_30d,
  eng.top_tweet_id,
  eng.top_tweet_text,
  eng.top_tweet_url,
  eng.top_tweet_likes
from public.velocity_x_accounts va
left join lateral (
  select
    sum(t.like_count + t.bookmark_count)              as momentum_30d,
    count(*)                                          as tweets_30d,
    (array_agg(t.id   order by t.like_count desc))[1] as top_tweet_id,
    (array_agg(t.text order by t.like_count desc))[1] as top_tweet_text,
    (array_agg(t.url  order by t.like_count desc))[1] as top_tweet_url,
    max(t.like_count)                                 as top_tweet_likes
  from public.xhunter_tweets t
  where t.handle = va.handle
    and t.created_at_x > now() - interval '30 days'
    and not t.is_rt
) eng on true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. velocity_viral_products_v — AI products ranked by viral launch reach
--    over the last 90 days.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.velocity_viral_products_v
with (security_invoker = true) as
select
  a.company,
  max(a.category)                                            as category,
  count(*)                                                   as launch_tweet_count,
  count(*) filter (where 'viral' = any(t.tags))              as viral_tweet_count,
  sum(t.like_count + t.retweet_count + t.bookmark_count)     as total_engagement,
  sum(t.view_count)                                          as total_views,
  max(t.like_count)                                          as top_like_count,
  (array_agg(t.id           order by t.like_count desc))[1]  as top_tweet_id,
  (array_agg(t.text         order by t.like_count desc))[1]  as top_tweet_text,
  (array_agg(t.url          order by t.like_count desc))[1]  as top_tweet_url,
  (array_agg(t.handle       order by t.like_count desc))[1]  as top_handle,
  (array_agg(t.author_name  order by t.like_count desc))[1]  as top_author_name,
  (array_agg(t.author_avatar order by t.like_count desc))[1] as top_author_avatar,
  (array_agg(t.created_at_x order by t.like_count desc))[1]  as top_tweet_at
from public.xhunter_tweets t
join public.xhunter_accounts a on a.handle = t.handle
where (t.tags && array['launch','viral'])
  and t.created_at_x > now() - interval '90 days'
  and not t.is_rt
group by a.company
having count(*) > 0;

grant select on public.velocity_x_source_v       to anon, authenticated, service_role;
grant select on public.velocity_builders_v       to anon, authenticated, service_role;
grant select on public.velocity_viral_products_v to anon, authenticated, service_role;

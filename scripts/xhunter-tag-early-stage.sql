-- Tag tweets as 'early-stage' if they're in the first 30 days of their account's
-- dataset history AND have like_count >= 100.
--
-- Definition (locked 2026-04-30): "early-stage" exemplar = something a new
-- founder posted near launch that *succeeded* (>=100 likes is the threshold).
-- For accounts whose dataset earliest tweet ≈ their actual launch (i.e. accounts
-- born during the scrape window 2024-05+), this captures their real launch arc.
-- For older accounts whose true early tweets predate 2024-05-09, this captures
-- only the "early in our dataset" tweets — flagged but not perfect.
--
-- Idempotent: re-running won't duplicate the 'early-stage' tag.
-- Run via Supabase SQL Editor or `supabase db psql`.

with first_tweet as (
  select handle, min(created_at_x) as t0
  from public.xhunter_tweets
  group by handle
)
update public.xhunter_tweets t
set tags = array_append(t.tags, 'early-stage')
from first_tweet f
where t.handle = f.handle
  and t.created_at_x <= f.t0 + interval '30 days'
  and t.like_count >= 100
  and not ('early-stage' = any(t.tags));

-- Post-tag verification
select
  count(*) filter (where 'early-stage' = any(tags))                  as tagged_tweets,
  count(distinct handle) filter (where 'early-stage' = any(tags))   as handles_with_early_stage,
  count(distinct handle)                                            as handles_total
from public.xhunter_tweets;

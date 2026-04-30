-- ViralX: lock to BYO-only + add cron resilience fields.
--
-- Decision (2026-05-01): X moved to pay-per-use in Feb 2026, with $0.20 per
-- URL-bearing tweet. OAuth 2.0 (where the app developer eats every user's API
-- bill) is not viable at our pricing — average active founder posts 100+/month.
-- Lock the product to BYO-token: every user supplies their own X dev keys and
-- pays X directly. Our cost is bounded to text/UI infra only.

-- 1. Narrow source enum to byo-only
alter table public.viralx_x_credentials drop constraint if exists viralx_x_credentials_source_check;
alter table public.viralx_x_credentials drop constraint if exists viralx_x_credentials_check;
alter table public.viralx_x_credentials
  add constraint viralx_x_credentials_source_check
    check (source = 'byo');
alter table public.viralx_x_credentials
  add constraint viralx_x_credentials_byo_keys_check
    check (consumer_key is not null and consumer_secret is not null
           and access_token is not null and access_token_secret is not null);

-- 2. Cron resilience for scheduled posting
alter table public.viralx_calendar_days
  add column if not exists failed_at       timestamptz,
  add column if not exists failure_reason  text,
  add column if not exists retry_count     integer not null default 0;

-- 3. Index for the cron's "due now" scan (only rows that need attention)
create index if not exists viralx_days_cron_due_idx
  on public.viralx_calendar_days (scheduled_at)
  where scheduled_at is not null and posted_at is null and retry_count < 3;

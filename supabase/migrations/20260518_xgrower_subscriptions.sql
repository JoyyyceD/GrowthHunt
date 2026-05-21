-- XGrower subscription tracking
-- Each user can have one active LemonSqueezy subscription.
-- A user is considered Pro via subscription when:
--   status = 'active' OR (cancelled_at IS NOT NULL AND current_period_end > now())
-- (i.e. cancelled-but-not-yet-expired users keep access until the period ends).

create table if not exists public.xgrower_subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  ls_subscription_id text unique not null,
  ls_variant_id      text not null,
  status             text not null,
  current_period_end timestamptz not null,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists xgrower_subscriptions_status_idx
  on public.xgrower_subscriptions (status);
create index if not exists xgrower_subscriptions_period_end_idx
  on public.xgrower_subscriptions (current_period_end);

alter table public.xgrower_subscriptions enable row level security;

drop policy if exists "xgrower_subscriptions_select_own"
  on public.xgrower_subscriptions;
create policy "xgrower_subscriptions_select_own"
  on public.xgrower_subscriptions for select to authenticated
  using (auth.uid() = user_id);

grant all    on table public.xgrower_subscriptions to service_role;
grant select on table public.xgrower_subscriptions to authenticated;

-- XGrower daily usage tracking
-- Enforces per-day quota in addition to monthly quota.

create table if not exists public.xgrower_daily_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  used       int  not null default 0 check (used >= 0),
  primary key (user_id, day)
);

create index if not exists xgrower_daily_usage_user_idx on public.xgrower_daily_usage (user_id);

alter table public.xgrower_daily_usage enable row level security;

create policy "xgrower_daily_usage_select_own"
  on public.xgrower_daily_usage for select to authenticated
  using (auth.uid() = user_id);

grant all    on table public.xgrower_daily_usage to service_role;
grant select on table public.xgrower_daily_usage to authenticated;

create or replace function public.xgrower_increment_daily_usage(p_user_id uuid, p_day date)
returns void language sql security definer as $$
  insert into public.xgrower_daily_usage (user_id, day, used)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day)
  do update set used = xgrower_daily_usage.used + 1;
$$;

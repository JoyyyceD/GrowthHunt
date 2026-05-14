-- XGrower usage tracking
-- Tracks monthly AI reply usage per user.
-- Quota enforced server-side: free = 50/month, paid = 500/month.

create table if not exists public.xgrower_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  month      date not null,  -- first day of month, e.g. 2026-05-01
  used       int  not null default 0 check (used >= 0),
  primary key (user_id, month)
);

create index if not exists xgrower_usage_user_idx on public.xgrower_usage (user_id);

alter table public.xgrower_usage enable row level security;

create policy "xgrower_usage_select_own"
  on public.xgrower_usage for select to authenticated
  using (auth.uid() = user_id);

grant all    on table public.xgrower_usage to service_role;
grant select on table public.xgrower_usage to authenticated;

-- Atomic increment — avoids read-modify-write races
create or replace function public.xgrower_increment_usage(p_user_id uuid, p_month date)
returns void language sql security definer as $$
  insert into public.xgrower_usage (user_id, month, used)
  values (p_user_id, p_month, 1)
  on conflict (user_id, month)
  do update set used = xgrower_usage.used + 1;
$$;

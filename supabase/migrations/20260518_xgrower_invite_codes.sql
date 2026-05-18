-- XGrower invite codes + pro grants
-- Invite codes give 30 days of Pro access to the redeemer.

create table if not exists public.xgrower_invite_codes (
  code        text primary key,
  max_uses    int not null default 1,
  used_count  int not null default 0 check (used_count >= 0),
  expires_at  timestamptz,   -- when the code itself expires (null = never)
  created_at  timestamptz not null default now()
);

-- Only service role can manage codes
alter table public.xgrower_invite_codes enable row level security;
grant all on table public.xgrower_invite_codes to service_role;

-- Pro grants: one row per user, tracks temporary Pro access
create table if not exists public.xgrower_pro_grants (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  invite_code text references public.xgrower_invite_codes(code),
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

alter table public.xgrower_pro_grants enable row level security;

create policy "xgrower_pro_grants_select_own"
  on public.xgrower_pro_grants for select to authenticated
  using (auth.uid() = user_id);

grant all    on table public.xgrower_pro_grants to service_role;
grant select on table public.xgrower_pro_grants to authenticated;

-- Atomically claim one use of an invite code.
-- Returns true if successful, false if code invalid/exhausted/expired.
create or replace function public.xgrower_claim_invite_code(p_code text)
returns boolean language plpgsql security definer as $$
declare
  rows_updated int;
begin
  update public.xgrower_invite_codes
  set used_count = used_count + 1
  where code = p_code
    and used_count < max_uses
    and (expires_at is null or expires_at > now());

  get diagnostics rows_updated = row_count;
  return rows_updated > 0;
end;
$$;

-- Seed a launch code (50 uses, no expiry). Change as needed.
insert into public.xgrower_invite_codes (code, max_uses)
values ('LAUNCH2026', 50)
on conflict (code) do nothing;

-- ViralX schema (Phase A — sessions + 14-day calendar)
-- The X publishing credentials table is deferred to the publishing phase.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. viralx_sessions — one per user "launch playbook" instance
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.viralx_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  handle          text not null,
  startup_blurb   text not null,
  start_date      date not null default current_date,
  status          text not null default 'active'
                    check (status in ('active','paused','completed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists viralx_sessions_user_idx on public.viralx_sessions (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. viralx_calendar_days — 14 rows per session
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.viralx_calendar_days (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.viralx_sessions(id) on delete cascade,
  day_number      integer not null check (day_number between 1 and 14),
  archetype       text not null,
  content_text    text,
  video_brief     text,
  scheduled_at    timestamptz,
  posted_at       timestamptz,
  x_post_id       text,
  exemplar_ids    text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (session_id, day_number)
);

create index if not exists viralx_days_session_idx
  on public.viralx_calendar_days (session_id);
create index if not exists viralx_days_due_idx
  on public.viralx_calendar_days (scheduled_at)
  where scheduled_at is not null and posted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — each authenticated user only sees their own rows.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.viralx_sessions      enable row level security;
alter table public.viralx_calendar_days enable row level security;

drop policy if exists "viralx_sessions_owner_all" on public.viralx_sessions;
create policy "viralx_sessions_owner_all"
  on public.viralx_sessions
  for all
  to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "viralx_days_owner_all" on public.viralx_calendar_days;
create policy "viralx_days_owner_all"
  on public.viralx_calendar_days
  for all
  to authenticated
  using (
    exists (
      select 1 from public.viralx_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.viralx_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. updated_at triggers (uses existing public.set_updated_at function)
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists viralx_sessions_updated_at on public.viralx_sessions;
create trigger viralx_sessions_updated_at
  before update on public.viralx_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists viralx_days_updated_at on public.viralx_calendar_days;
create trigger viralx_days_updated_at
  before update on public.viralx_calendar_days
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Grants — required when tables are created via Management API
-- ─────────────────────────────────────────────────────────────────────────────
grant all privileges on table public.viralx_sessions      to service_role, postgres;
grant all privileges on table public.viralx_calendar_days to service_role, postgres;

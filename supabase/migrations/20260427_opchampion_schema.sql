-- OPChampion schema
-- Run this once in Supabase Studio → SQL Editor (or via supabase CLI db push).
-- Idempotent where possible (uses if not exists / on conflict).

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles  — mirrors auth.users for fields we display
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  avatar_url    text,
  twitter       text,
  bio           text,
  site          text,
  created_at    timestamptz not null default now()
);

-- Auto-create profile row on auth.users insert (Google OAuth sign-in)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- champions  — the products
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.champions (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$' and length(slug) <= 80),
  name            text not null check (length(name) between 1 and 80),
  by_name         text,                              -- founder display name (mock field "by")
  founder_type    text,                              -- e.g. "Solo founder, ex-Stripe"
  tagline         text not null check (length(tagline) <= 100),
  about           text check (length(about) <= 1000),
  url             text check (url is null or url ~* '^https?://'),
  category        text,
  hue             text check (hue is null or hue ~* '^#[0-9a-f]{6}$'),
  logo_url        text,
  image1_url      text,
  image2_url      text,
  status          text not null default 'live' check (status in ('live','soon','archived')),
  featured        boolean not null default false,
  source          text not null default 'user' check (source in ('user','editorial','producthunt')),
  owner_id        uuid references public.profiles(id) on delete set null,
  upvote_count    integer not null default 0,
  comment_count   integer not null default 0,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists champions_created_at_idx on public.champions (created_at desc) where deleted_at is null;
create index if not exists champions_upvote_count_idx on public.champions (upvote_count desc) where deleted_at is null;
create index if not exists champions_featured_idx on public.champions (featured) where deleted_at is null;
create index if not exists champions_owner_idx on public.champions (owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- votes  — per-user OR per-IP-per-day
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.votes (
  id           uuid primary key default gen_random_uuid(),
  champion_id  uuid not null references public.champions(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,
  ip_hash      text,
  created_at   timestamptz not null default now(),
  check (user_id is not null or ip_hash is not null)
);

create unique index if not exists votes_user_unique on public.votes (champion_id, user_id) where user_id is not null;
create unique index if not exists votes_ip_unique on public.votes (champion_id, ip_hash) where ip_hash is not null and user_id is null;
create index if not exists votes_user_idx on public.votes (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- comments  — flat, no nesting
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  champion_id  uuid not null references public.champions(id) on delete cascade,
  author_id    uuid references public.profiles(id) on delete set null,
  body         text not null check (length(body) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create index if not exists comments_champion_idx on public.comments (champion_id, created_at desc);
create index if not exists comments_author_idx on public.comments (author_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- hot_score  — HN-style ranking, computed at query time
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.hot_score(upvotes integer, created_at timestamptz)
returns numeric
language sql
immutable
as $$
  select greatest(0::numeric,
    (greatest(upvotes, 0)::numeric - 1)
    / power(extract(epoch from (now() - created_at)) / 3600.0 + 2.0, 1.6)
  )
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers: denormalize counts on champions
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.refresh_upvote_count()
returns trigger
language plpgsql
as $$
declare
  cid uuid := coalesce(new.champion_id, old.champion_id);
begin
  update public.champions
     set upvote_count = (select count(*) from public.votes where champion_id = cid)
   where id = cid;
  return null;
end;
$$;

drop trigger if exists votes_count_trigger on public.votes;
create trigger votes_count_trigger
  after insert or delete on public.votes
  for each row execute function public.refresh_upvote_count();

create or replace function public.refresh_comment_count()
returns trigger
language plpgsql
as $$
declare
  cid uuid := coalesce(new.champion_id, old.champion_id);
begin
  update public.champions
     set comment_count = (select count(*) from public.comments where champion_id = cid)
   where id = cid;
  return null;
end;
$$;

drop trigger if exists comments_count_trigger on public.comments;
create trigger comments_count_trigger
  after insert or delete on public.comments
  for each row execute function public.refresh_comment_count();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.champions enable row level security;
alter table public.votes     enable row level security;
alter table public.comments  enable row level security;

-- profiles: public read, self-write
drop policy if exists "profiles_read_public"   on public.profiles;
drop policy if exists "profiles_update_self"   on public.profiles;
create policy "profiles_read_public"
  on public.profiles for select to anon, authenticated
  using (true);
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- champions: public read non-deleted; authenticated insert; owner update/delete
drop policy if exists "champions_read_public"  on public.champions;
drop policy if exists "champions_insert_auth"  on public.champions;
drop policy if exists "champions_update_owner" on public.champions;
drop policy if exists "champions_delete_owner" on public.champions;
create policy "champions_read_public"
  on public.champions for select to anon, authenticated
  using (deleted_at is null);
create policy "champions_insert_auth"
  on public.champions for insert to authenticated
  with check (owner_id = auth.uid());
create policy "champions_update_owner"
  on public.champions for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "champions_delete_owner"
  on public.champions for delete to authenticated
  using (owner_id = auth.uid());

-- votes: anon+auth can read public counts (we read directly for /me/voted);
-- inserts happen ONLY through service role from API route handlers (enforces ip_hash);
-- so no insert/delete policy here for client roles — service role bypasses RLS.
drop policy if exists "votes_read_public" on public.votes;
create policy "votes_read_public"
  on public.votes for select to anon, authenticated
  using (true);

-- comments: public read; auth insert; author update/delete
drop policy if exists "comments_read_public"   on public.comments;
drop policy if exists "comments_insert_auth"   on public.comments;
drop policy if exists "comments_update_author" on public.comments;
drop policy if exists "comments_delete_author" on public.comments;
create policy "comments_read_public"
  on public.comments for select to anon, authenticated
  using (true);
create policy "comments_insert_auth"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid());
create policy "comments_update_author"
  on public.comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comments_delete_author"
  on public.comments for delete to authenticated
  using (author_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Table grants — service_role needs explicit privileges (Supabase doesn't
-- auto-grant on public schema for tables created via SQL). Without this,
-- API routes using the admin client get `42501 permission denied` even
-- though service_role bypasses RLS.
-- ─────────────────────────────────────────────────────────────────────────────
grant all on table public.profiles  to service_role, postgres;
grant all on table public.champions to service_role, postgres;
grant all on table public.votes     to service_role, postgres;
grant all on table public.comments  to service_role, postgres;
grant usage, select on all sequences in schema public to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket: opchampion-media (public read, owner write)
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'opchampion-media',
  'opchampion-media',
  true,
  2 * 1024 * 1024,                                           -- 2 MB
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: public read; uploads gated through API (service role).
-- We do NOT allow direct client uploads — keeps owner-check enforcement
-- in one place (the upload route handler).
drop policy if exists "opchampion_media_read_public" on storage.objects;
create policy "opchampion_media_read_public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'opchampion-media');

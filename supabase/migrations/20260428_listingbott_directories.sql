-- ListingBott directories
-- Source-of-truth list of directories we submit to via the get-backlinks
-- service. The /get-backlinks page reads directly from this table.
--
-- Add new directories via Supabase Studio — the page picks them up
-- on next request. set status='inactive' to hide without deleting.

create table if not exists public.listingbott_directories (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name                text not null,
  url                 text not null check (url ~* '^https?://'),
  submission_url      text check (submission_url is null or submission_url ~* '^https?://'),
  dr                  integer check (dr is null or (dr >= 0 and dr <= 100)),
  monthly_traffic     text,
  categories          text[] not null default '{}',
  do_follow           boolean,
  needs_account       boolean default false,
  has_captcha         boolean default false,
  price_tier          text default 'free' check (price_tier in ('free','freemium','paid','featured')),
  submission_method   text default 'form' check (submission_method in ('form','email','github_pr','api','manual')),
  approval_eta        text,
  notes               text,
  status              text default 'active' check (status in ('active','inactive','dead','unverified')),
  featured            boolean default false,
  display_order       integer default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists lb_dirs_status_dr_idx     on public.listingbott_directories (status, dr desc);
create index if not exists lb_dirs_categories_gin_idx on public.listingbott_directories using gin (categories);
create index if not exists lb_dirs_featured_idx      on public.listingbott_directories (featured) where featured = true;

alter table public.listingbott_directories enable row level security;

drop policy if exists "lb_dirs_read_active" on public.listingbott_directories;
create policy "lb_dirs_read_active"
  on public.listingbott_directories for select to anon, authenticated
  using (status = 'active');

grant all    on table public.listingbott_directories to service_role, postgres;
grant select on table public.listingbott_directories to anon, authenticated;

drop trigger if exists lb_dirs_updated_at on public.listingbott_directories;
create trigger lb_dirs_updated_at
  before update on public.listingbott_directories
  for each row execute function public.set_updated_at();

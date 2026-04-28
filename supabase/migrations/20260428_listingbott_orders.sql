-- ListingBott orders
-- Stores directory submission orders placed through GrowthHunt.
-- Status flow: pending → confirmed → in_progress → delivered

create table if not exists public.listingbott_orders (
  id            uuid primary key default gen_random_uuid(),
  product_url   text not null check (product_url ~* '^https?://'),
  product_name  text not null check (length(product_name) between 1 and 100),
  description   text check (length(description) <= 1000),
  goal          text not null default 'dr' check (goal in ('dr', 'awareness')),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status        text not null default 'pending' check (status in ('pending','confirmed','in_progress','delivered','cancelled')),
  user_id       uuid references public.profiles(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists listingbott_orders_status_idx on public.listingbott_orders (status, created_at desc);
create index if not exists listingbott_orders_user_idx   on public.listingbott_orders (user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists listingbott_orders_updated_at on public.listingbott_orders;
create trigger listingbott_orders_updated_at
  before update on public.listingbott_orders
  for each row execute function public.set_updated_at();

alter table public.listingbott_orders enable row level security;

-- Public can insert; only service role reads (admin only)
drop policy if exists "listingbott_insert_anon" on public.listingbott_orders;
create policy "listingbott_insert_anon"
  on public.listingbott_orders for insert to anon, authenticated
  with check (true);

-- Authenticated users can see their own orders
drop policy if exists "listingbott_read_own" on public.listingbott_orders;
create policy "listingbott_read_own"
  on public.listingbott_orders for select to authenticated
  using (user_id = auth.uid());

-- Email subscriptions
-- Stores every email captured by EmailForm (homepage waitlist, feature
-- "notify me when ready" buttons, etc.). Mirrors what Brevo sees, so
-- we can query leads from one place.
--
-- Unique on (email, source) so re-submissions are idempotent.

create table if not exists public.email_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source      text not null check (length(source) between 1 and 80),
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  unique (email, source)
);

create index if not exists email_subscriptions_created_idx on public.email_subscriptions (created_at desc);
create index if not exists email_subscriptions_email_idx   on public.email_subscriptions (email);
create index if not exists email_subscriptions_source_idx  on public.email_subscriptions (source);

alter table public.email_subscriptions enable row level security;

drop policy if exists "email_subscriptions_insert_anon" on public.email_subscriptions;
create policy "email_subscriptions_insert_anon"
  on public.email_subscriptions for insert to anon, authenticated
  with check (true);

grant all    on table public.email_subscriptions to service_role, postgres;
grant insert on table public.email_subscriptions to anon, authenticated;

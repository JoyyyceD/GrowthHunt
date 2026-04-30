-- ViralX X credentials — BYO-token (OAuth 1.0a) for v1.
-- v2 will add full OAuth 2.0 user-context support; for now users paste their
-- own consumer/access keys from their X developer app and we sign requests.
--
-- TODO(v2): encrypt-at-rest via pgsodium or Supabase Vault. Plaintext is OK
-- for a private beta but unacceptable for general release.

create table if not exists public.viralx_x_credentials (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  source               text not null default 'byo' check (source in ('byo','oauth')),
  consumer_key         text,
  consumer_secret      text,
  access_token         text,
  access_token_secret  text,
  x_screen_name        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (
    source = 'oauth' or
    (source = 'byo' and consumer_key is not null and consumer_secret is not null
       and access_token is not null and access_token_secret is not null)
  )
);

alter table public.viralx_x_credentials enable row level security;

drop policy if exists "viralx_creds_owner_all" on public.viralx_x_credentials;
create policy "viralx_creds_owner_all"
  on public.viralx_x_credentials
  for all
  to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

drop trigger if exists viralx_creds_updated_at on public.viralx_x_credentials;
create trigger viralx_creds_updated_at
  before update on public.viralx_x_credentials
  for each row execute function public.set_updated_at();

grant all privileges on table public.viralx_x_credentials to service_role, postgres;
grant select, insert, update, delete on public.viralx_x_credentials to authenticated;

-- Fix: comment_count + upvote_count triggers were running as the calling
-- user's role, so RLS blocked the UPDATE on champions whenever the commenter
-- or voter wasn't the launch owner (champions_update_owner policy requires
-- owner_id = auth.uid()). Silent failure: comment_count stayed stale on
-- launches owned by other users.
--
-- Fix: SECURITY DEFINER so the trigger runs with the function definer's
-- (postgres) privileges and bypasses RLS for these aggregate count refreshes.
-- search_path is pinned to prevent search-path-poisoning when running as
-- definer.

create or replace function public.refresh_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.refresh_upvote_count()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Backfill any drift accumulated before this fix
update public.champions c
set
  comment_count = (select count(*) from public.comments where champion_id = c.id),
  upvote_count  = (select count(*) from public.votes    where champion_id = c.id)
where c.deleted_at is null;

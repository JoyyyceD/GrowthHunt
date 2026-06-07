-- Post media storage — a public bucket for images/video attached to scheduled
-- posts. Uploads go through /api/social/media using the service-role client (so
-- bucket RLS is bypassed on write); reads are public so the platform publish
-- adapters (and Reddit link-posts) can fetch the bytes by URL.
--
-- The gtm_scheduled_posts.media jsonb column (added in 20260529_postiz_integration)
-- stores an array of { id, path, url, kind, mime, bytes } objects.

insert into storage.buckets (id, name, public, file_size_limit)
values ('post-media', 'post-media', true, 536870912)          -- 512 MB cap (video)
on conflict (id) do update set public = true, file_size_limit = 536870912;

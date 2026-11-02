# Affiliate publisher preview — 2026-11-02

Local preview only. No deployment or merchant application is authorized by this preview.

Run `GH_REVIEW_PREVIEW=1 npm run dev -- --webpack --hostname 127.0.0.1 --port 3107`.
The flag disables analytics and enables noindex and review notices; it is not authentication.

Source: isolated copy of /Users/joycedong/dev/GrowthHunt2.0 local HEAD. User changes in the
original working tree were deliberately not copied or committed. In particular, preserve
the original layout's uncommitted Mitgo verification meta during any later integration.

Owner inputs and verification limits:
/Users/joycedong/dev/Galaxy/projects/growthhunt/research/affiliate-transition-2026-11-02.md

Privacy and Terms are review drafts and must be completed before any production release.
TypeScript and local smoke checks passed. Full build compiled and type checked, then
failed on existing /velocity prerender because production Supabase settings are absent.
Production environment files were not copied. Do not treat this as deployment validation.

The original business site and its backend remain untouched.

## Broad software homepage revision

The main audience is now individuals, creators, and small teams. Five software categories
cover documents, video, meetings, AI assistants, and design. Category links filter the
software index using server-rendered query parameters.

The original GTM homepage is preserved at /legacy-home with no incoming editorial links,
no sitemap/llms listing, and explicit noindex/nofollow. It is an unlinked archive, not
an authenticated private page. Its historical marketing copy is retained as an archive.
The previous /products hub also has no incoming editorial navigation or sitemap listing.

New sitemap entries are emitted once at the top level; the earlier preview's accidental
per-company duplication has been fixed.

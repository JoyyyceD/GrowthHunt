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
TypeScript, local schema semantics, and the production-mode build passed on 2026-11-03.
The build used only two existing public connection parameters injected in process memory;
no environment file or admin credential was copied. Built-server indexability checks are
recorded in Galaxy research. These are local checks, not deployed-domain validation.

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

## GEO completion — 2026-11-03

Detail pages emit Article + WebPage + BreadcrumbList; collection pages emit CollectionPage
and ItemList matching visible entries. Schema dates and the visible dates use the same
explicit editorial fields. Source-check dates are separate from content revision dates;
unpublished drafts intentionally have no datePublished.

Sitemap no longer uses a build/request clock. Known dates come from editorial records or
existing content frontmatter; pages without a trustworthy recorded revision omit lastmod.
New page-specific OG/Twitter metadata and the broad-software share card replace GTM defaults.

Owner identity, monitored contact email, and actual data practices remain to be confirmed
before Privacy/Terms are treated as final. Nothing has been deployed or applied to merchants.

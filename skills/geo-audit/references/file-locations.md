# File Locations by Framework

Detect the framework first, then edit the right file. Detection hints:
`next.config.*` → Next.js · `astro.config.*` → Astro · `hugo.toml`/`config.toml`
→ Hugo · `.eleventy.js` → 11ty · only `.html` files → static.

## Next.js — App Router (`app/`)

| Setting | File |
|---|---|
| title / description / canonical / OG | `export const metadata` in `app/<route>/page.tsx` (page-specific) or `app/layout.tsx` (site-wide defaults) |
| JSON-LD | a `<script type="application/ld+json">` rendered in the page/layout via `dangerouslySetInnerHTML` |
| robots.txt | `app/robots.ts` (or `public/robots.txt`) |
| sitemap.xml | `app/sitemap.ts` |
| llms.txt | `public/llms.txt` |

## Next.js — Pages Router (`pages/`)

| Setting | File |
|---|---|
| title / meta / OG | `<Head>` from `next/head` inside the page component |
| JSON-LD | `<script type="application/ld+json">` inside `<Head>` |
| robots.txt / llms.txt | `public/robots.txt`, `public/llms.txt` |

## Astro

| Setting | File |
|---|---|
| title / meta / OG / JSON-LD | the page's `.astro` frontmatter + `<head>`; usually a shared `src/layouts/*.astro` |
| robots.txt / llms.txt | `public/robots.txt`, `public/llms.txt` |
| sitemap | `@astrojs/sitemap` integration in `astro.config.*` |

## Hugo

| Setting | File |
|---|---|
| title / meta / OG | front matter in `content/**/*.md` + `layouts/partials/head.html` |
| JSON-LD | `layouts/partials/` template |
| robots.txt / llms.txt | `static/robots.txt`, `static/llms.txt` |

## 11ty (Eleventy)

| Setting | File |
|---|---|
| title / meta | front matter + the layout in `_includes/` |
| robots.txt / llms.txt | files in the input dir (passthrough-copied) |

## Static HTML

Edit each `.html` file's `<head>` directly. Place `robots.txt` and `llms.txt` at
the site root.

## Notes

- A site-wide setting (Organization JSON-LD, robots.txt) → edit once in the
  layout/root. A page-specific setting (title, Article schema) → edit per page.
- After editing, the **live URL only changes once the site is redeployed** —
  re-run the audit after deploy, not before.

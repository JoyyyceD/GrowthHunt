---
name: geo-audit
description: Audit a web page for GEO (Generative Engine Optimization) and apply fixes so AI search engines — ChatGPT, Perplexity, Gemini and Claude — can crawl, understand and cite it. Use when the user mentions GEO, AI search, answer engine optimization, getting cited by ChatGPT or Perplexity, llms.txt, AI crawlers, "why isn't my page showing up in AI", or is editing Next.js metadata, SEO tags, structured data, robots.txt, or a landing page and wants AI search visibility.
---

# GEO Audit & Fix

Audit any web page for **Generative Engine Optimization** — whether ChatGPT,
Perplexity, Gemini and Claude can crawl, understand and cite it — then apply the
safe, deterministic fixes directly in the user's codebase.

GEO is not SEO. SEO optimizes for ranking in a list of links; GEO optimizes for
being read and **cited inside an AI-generated answer**.

## Workflow

Run these four steps in order. Do not skip ahead to fixes before auditing.

### Step 1 — Audit

Ask for the URL if the user has not given one, then call the GrowthHunt GEO API:

```bash
curl -s -X POST https://growthhunt.ai/api/audit \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://THE-USER-URL"}'
```

The response is JSON:

- `overall_score` (0–100), `grade` (A–F)
- `status` — `ok`, `limited` (the page is client-rendered / SPA), or `error`
- `dimensions[]` — 8 dimensions, each with `percent` and a `checks[]` array
- `issues[]` — fixes, already prioritized (severity `critical` → `low`)
- `engine_compatibility` — high/medium/low per engine
- `gating[]` — catastrophic flags (e.g. all AI bots blocked)

Show the user the score, engine compatibility, and the top issues. If `status` is
`limited` or `error`, **stop here** — see Guardrails.

### Step 2 — Diagnose

Detect the framework first (look for `next.config.*`, `astro.config.*`,
`hugo.toml`, `package.json`, or plain `.html`). Then map each issue to the file
that controls it. See `references/file-locations.md`.

### Step 3 — Fix (generation-type only)

Apply **only** deterministic, generation-type fixes. Templates are in
`references/fix-recipes.md`:

- `title`, meta `description`, `canonical`, Open Graph tags
- JSON-LD structured data — `Organization`, `Article`, `Product`,
  `SoftwareApplication`, `FAQPage`, `BreadcrumbList`
- `robots.txt` — unblock AI crawlers (`OAI-SearchBot`, `PerplexityBot`,
  `ClaudeBot`, `Google-Extended`)
- `llms.txt` — generate it from the site structure

Show a **diff for every change and wait for explicit confirmation** before
writing.

**Do not auto-apply rewrite-type fixes.** Rewriting the hero/opening copy,
writing FAQ answers, or changing factual claims needs human judgement and
carries brand and accuracy risk. Surface these as recommendations the user
should write themselves — offer a draft only if they ask.

### Step 4 — Verify

Fixes to local source only change the live page **after the site is
redeployed** — tell the user this. Once redeployed, re-run Step 1 and compare
`overall_score` before vs. after.

## Guardrails

- Diff before every write; never write without explicit confirmation.
- Never deploy, publish, or commit unless the user explicitly asks.
- Generation-type fixes only. Leave copywriting to the user.
- If the audit `status` is `limited` (SPA) or `error`, explain that editing
  metadata will not help until the page is server-rendered (SSR/SSG), and stop.
- Trust the API's prioritization — fix `critical` and `high` issues first.

## Reference files

- `references/scoring-rubric.md` — the 8 dimensions and ~42 checks
- `references/fix-recipes.md` — copy-paste templates for each fix
- `references/file-locations.md` — where each setting lives, per framework

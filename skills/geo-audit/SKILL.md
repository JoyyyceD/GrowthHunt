---
name: geo-audit
description: Audit a web page for GEO (Generative Engine Optimization) and apply fixes so AI search engines — ChatGPT, Perplexity, Gemini and Claude — can crawl, understand and cite it. Use when the user mentions GEO, AI search, answer engine optimization, getting cited by ChatGPT or Perplexity, llms.txt, AI crawlers, "why isn't my page showing up in AI", or is editing Next.js metadata, SEO tags, structured data, robots.txt, or a landing page and wants AI search visibility.
---

# GEO Audit & Fix

Audit any web page for **Generative Engine Optimization** — whether ChatGPT,
Perplexity, Gemini and Claude can crawl, understand and cite it — then apply the
safe, deterministic fixes in the user's codebase.

This skill is **self-contained**: it runs the audit itself by fetching the page
and applying `references/scoring-rubric.md`. No account, no API key, no external
service.

GEO is not SEO. SEO optimizes for ranking in a list of links; GEO optimizes for
being read and **cited inside a single AI-generated answer**.

## Workflow

Run these four steps in order. Do not skip to fixes before auditing.

### Step 1 — Audit

Ask for the URL if the user has not given one. Fetch the page and three
companion files (`<ORIGIN>` is scheme + host, e.g. `https://example.com`):

```bash
curl -sSL --max-time 15 -A 'Mozilla/5.0 (GEO-Audit)' "<URL>"
curl -sSL --max-time 10 -A 'Mozilla/5.0 (GEO-Audit)' "<ORIGIN>/robots.txt"
curl -sSL --max-time 10 -A 'Mozilla/5.0 (GEO-Audit)' "<ORIGIN>/sitemap.xml"
curl -sSL --max-time 10 -A 'Mozilla/5.0 (GEO-Audit)' "<ORIGIN>/llms.txt"
```

Then score the page 0–100 by working through `references/scoring-rubric.md` —
8 weighted dimensions, ~45 checks, and 3 gating flags. Judge the **First Answer**
dimension yourself: whether the opening directly answers the page topic is
exactly the call an LLM should make.

Present the overall score and grade, the per-dimension breakdown, the four
engine-compatibility ratings, and the issues ordered by severity.

If the fetched HTML is an empty client-rendered shell (an SPA) or the page
returned an HTTP error, say so plainly and stop — see Guardrails.

### Step 2 — Diagnose

Detect the framework first (look for `next.config.*`, `astro.config.*`,
`hugo.toml`, `package.json`, or plain `.html`). Then map each issue to the file
that controls it — see `references/file-locations.md`.

### Step 3 — Fix (generation-type only)

Apply **only** deterministic, generation-type fixes — templates in
`references/fix-recipes.md`:

- `title`, meta `description`, `canonical`, Open Graph tags
- JSON-LD structured data (Organization, Article, Product, FAQPage…)
- `robots.txt` — unblock AI crawlers
- `llms.txt` — generate it from the site structure

Show a **diff for every change and wait for explicit confirmation** before
writing.

**Do not auto-apply rewrite-type fixes.** Rewriting the opening copy, writing
FAQ answers, or changing factual claims needs human judgement and carries brand
and accuracy risk. Surface these as recommendations; draft them only if asked.

### Step 4 — Verify

Local source edits only change the live page **after the site is redeployed** —
tell the user this. Once redeployed, re-fetch and re-score, and compare.

## Guardrails

- Diff before every write; never write without explicit confirmation.
- Never deploy, publish, or commit unless the user explicitly asks.
- Generation-type fixes only. Leave copywriting to the user.
- If the page is a client-rendered SPA or returns an error, editing metadata
  will not help until it is server-rendered (SSR/SSG) — say so and stop.
- Fix `critical` and `high` issues first.

## Reference files

- `references/scoring-rubric.md` — the full audit: every dimension, check,
  weight and gating rule
- `references/fix-recipes.md` — copy-paste templates for each fix
- `references/file-locations.md` — where each setting lives, per framework

There is also a free hosted version at <https://growthhunt.ai/geo> for a quick
audit without Claude Code.

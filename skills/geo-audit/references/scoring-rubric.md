# GEO Scoring Rubric

The complete, self-contained audit. Work through every dimension on the fetched
page and companion files — no external API is used.

## How to score

For each **check**, decide: `pass` / `partial` / `fail` / `n/a`.

- `pass` = full points · `partial` = half (rounded) · `fail` = 0
- `n/a` = excluded from that dimension's available total (not penalized)

Then:

1. **Dimension percent** = earned ÷ available × 100 (round). If everything is
   `n/a`, the dimension is 100.
2. **Dimension contribution** = percent × weight ÷ 100.
3. **Overall (pre-gating)** = sum of all 8 contributions.
4. **Apply gating** = `overall = min(overall, every triggered cap, 100)`, rounded.
5. **Grade**: A ≥ 85 · B ≥ 70 · C ≥ 55 · D ≥ 40 · F < 40.

The 8 weights sum to 100: Crawler Access 13 · Indexability & Discovery 12 ·
Structure 15 · Schema 12 · Factual Density 13 · Entity Clarity 10 · Freshness 10
· First Answer 15.

## robots.txt parsing

Parse `robots.txt` into groups: consecutive `User-agent:` lines open/extend a
group; following `Disallow:`/`Allow:` lines belong to it. A bot is **blocked**
when its applicable group (an exact name match, otherwise the `*` group) has
`Disallow: /` and no matching `Allow: /`. No robots.txt → nothing is blocked.

---

## 1. Crawler Access — weight 13

- **robots.txt present** (10) — fetched and non-empty → pass; missing → partial.
- **ChatGPT crawler (OAI-SearchBot) allowed** (15) — blocked in robots.txt → fail.
- **Perplexity crawler (PerplexityBot) allowed** (15) — blocked → fail.
- **Claude crawler (ClaudeBot) allowed** (15) — blocked → fail.
- **Gemini crawler (Google-Extended) allowed** (10) — blocked → fail.
- **No meta robots noindex** (15) — `<meta name="robots">` or `name="googlebot"` content contains `noindex` → fail.
- **No X-Robots-Tag noindex** (10) — response header `X-Robots-Tag` contains `noindex` → fail. (Get headers with `curl -sSI <URL>`.)
- **HTTP status OK** (15) — final status 2xx → pass; otherwise fail.
- **Not blocked by a bot firewall** (12) — status 403/503/429 with body text like "just a moment", "checking your browser", or a Cloudflare challenge → fail.

## 2. Indexability & Discovery — weight 12

- **sitemap.xml present** (12) — `/sitemap.xml` fetched and non-empty → pass.
- **URL listed in sitemap** (12) — the audited URL appears in sitemap.xml → pass; sitemap is a `<sitemapindex>` (can't verify here) or no sitemap → n/a; sitemap present, not an index, URL absent → fail.
- **Canonical tag present and self-referential** (10) — `<link rel="canonical">` present and same-origin → pass; present but off-origin → partial; absent → fail.
- **/llms.txt present** (14) — `/llms.txt` fetched and non-empty → pass.
- **llms.txt well-structured** (8) — n/a if no llms.txt; otherwise it should have an H1 (`# `), `## ` sections, and a summary line — all three → pass, one or two → partial, none → fail.
- **RSS / Atom feed** (6) — `<link type="application/rss+xml">` or `application/atom+xml` in `<head>` → pass.

## 3. Structure — weight 15

- **Exactly one H1** (14) — exactly one → pass; none → fail; more than one → partial.
- **Heading levels not skipped** (10) — list h1–h6 in document order; a jump of more than one level down (e.g. H2→H4) is a skip. 0 skips → pass; 1–2 → partial; 3+ or no headings → fail.
- **Uses lists / tables** (10) — any `<ul>`, `<ol>` or `<table>` → pass.
- **Has an FAQ section** (14) — FAQPage JSON-LD, OR an `<h2>/<h3>` containing `?`, OR a `<details>`, OR an element whose id/class contains "faq" → pass.
- **Content not too thin** (12) — visible word count ≥ 300 → pass; 150–299 → partial; < 150 → fail.
- **Semantic HTML** (8) — count of `<main>/<article>/<section>/<nav>/<aside>/<header>/<footer>`: ≥ 3 → pass; 1–2 → partial; 0 → fail.

## 4. Schema — weight 12

Extract every `<script type="application/ld+json">` block and parse each as JSON.

- **JSON-LD present** (14) — at least one block → pass.
- **JSON-LD parses cleanly** (8) — n/a if no blocks; all blocks parse → pass; any fails → fail.
- **Organization / WebSite schema** (10) — a node with `@type` of Organization, WebSite, LocalBusiness or Corporation → pass.
- **Page-type schema** (12) — a node with `@type` of Article, BlogPosting, NewsArticle, Product, SoftwareApplication, WebApplication, HowTo, Recipe, WebPage, Service or CollectionPage → pass.
- **FAQPage schema** (8) — a `FAQPage` node → pass.
- **Open Graph tags complete** (8) — `og:title`, `og:description`, `og:type` all present → pass; 1–2 → partial; 0 → fail.
- **sameAs entity links** (6) — any schema node has a non-empty `sameAs` → pass.

## 5. Factual Density — weight 13

Work on the visible text (scripts/styles stripped).

- **Number / data density** (14) — count number tokens; per 1000 words: ≥ 15 → pass; 5–14 → partial; < 5 → fail.
- **Includes percentages** (8) — count of `NN%` figures: ≥ 2 → pass; 1 → partial; 0 → fail.
- **Includes years / dates** (8) — a 19xx/20xx year **and** a month name → pass; one of them → partial; neither → fail.
- **Sourcing phrases** (12) — count of phrases such as "according to", "research shows", "study found", "data from", "survey", "found that", "as reported by": ≥ 2 → pass; 1 → partial; 0 → fail.
- **Concrete data points** (8) — count of currency amounts (`$€£¥` + digit) and unit figures (digit + ms/kg/km/mb/gb/hrs/days/etc.): ≥ 3 → pass; 1–2 → partial; 0 → fail.

## 6. Entity Clarity — weight 10

First derive the **brand name**: `og:site_name` → else the `name` of an
Organization/WebSite schema node → else the domain's second-level label
(e.g. `acme` from `acme.com`).

- **Title tag present and well-sized** (8) — `<title>` exists and is 10–70 chars → pass; exists but off-length → partial; missing → fail.
- **Meta description present** (8) — exists and 50–160 chars → pass; exists → partial; missing → fail.
- **Brand name in title** (8) — brand appears in `<title>` → pass.
- **Brand name in H1** (12) — brand appears in the first H1 → pass; otherwise partial.
- **Brand name in meta description** (8) — brand appears in the meta description → pass.
- **Brand name in opening copy** (10) — brand appears in the first ~250 characters of visible text → pass.
- **About / Contact links** (6) — a link with href containing "about" or "contact" → pass.

## 7. Freshness — weight 10

- **Schema has publish/modified date** (10) — JSON-LD has `datePublished` or `dateModified` → pass.
- **Page has a visible date** (8) — a `<time datetime>` element, or an `article:modified_time` / `article:published_time` meta → pass.
- **Current year in copy** (8) — the current calendar year appears in the visible text → pass.
- **Content not stale (< 12 months)** (14) — take the newest machine-readable date (schema dates, `<time datetime>`, article meta): ≤ 6 months → pass; 6–12 → partial; > 12 → fail; no date found → n/a.
- **Site recently updated** (10) — newest `<lastmod>` in sitemap.xml: ≤ 90 days → pass; ≤ 365 → partial; older → fail; no sitemap or no lastmod → n/a.

## 8. First Answer — weight 15 (you judge this)

- **First ~80 words directly answer the topic** (65) — read the opening ~80 words: it clearly states what the page/product is and the problem it solves → pass; vague → partial; no → fail.
- **Title maps to a real question/query** (35) — the title matches a question or search a user would actually type → pass; loosely → partial; generic/branding-only → fail.

## Gating flags

Each, when triggered, caps the overall score:

- **All AI crawlers blocked** — OAI-SearchBot, PerplexityBot and ClaudeBot are all blocked in robots.txt → cap **25**.
- **Page-wide noindex** — meta `noindex` or `X-Robots-Tag: noindex` → cap **30**.
- **Page not fully analyzable** — HTTP status ≥ 400 → cap **0**; client-rendered SPA shell → cap **60**.

## SPA detection

If the fetched HTML body has very little visible text (under ~120 words) and is
dominated by `<script>` tags and a single mount node (`#root`, `#app`,
`#__next`, `[data-reactroot]`), it is a **client-rendered SPA**. You are seeing
only the shell — and so does any AI crawler that does not run JavaScript. Report
status `limited`, explain this honestly, and note the real fix is server-side
rendering (SSR/SSG). Do not present a misleading low score as if it were a
content problem.

## Engine compatibility

For each engine: if its crawler is blocked in robots.txt → `low`. Otherwise by
overall score: ≥ 70 → `high`; ≥ 45 → `medium`; else `low`.
(chatgpt → OAI-SearchBot · perplexity → PerplexityBot · gemini → Google-Extended
· claude → ClaudeBot.)

## Issues & output

Turn every non-`pass` check into an **issue**. Severity: a triggered gating
flag → `critical`; a `fail` in a dimension of weight ≥ 12 → `high`; other
`fail` → `medium`; `partial` → `low`. Sort by severity. Each issue states what
was found and the concrete fix.

Present the result like:

```
GEO Score  61 / 100  (C)
AI visibility   ChatGPT ◐   Perplexity ●   Gemini ◐   Claude ○

  Crawler Access            96%
  Indexability & Discovery  58%
  …
  First Answer              30%

Priority fixes
  1  [high]  …
  2  [med]   …
```

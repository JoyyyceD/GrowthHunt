# GEO Scoring Rubric

The audit scores 8 weighted dimensions (weights sum to 100) across ~42 checks.
Each dimension normalizes to 0–100; `overall_score` is the weighted sum, then
capped by any triggered gating flag.

## Dimensions

| Dimension | Weight | What it checks |
|---|---|---|
| Crawler Access | 13 | robots.txt allows OAI-SearchBot / PerplexityBot / ClaudeBot / Google-Extended; no meta `noindex`; no `X-Robots-Tag: noindex`; HTTP 200; not behind a bot wall |
| Indexability & Discovery | 12 | sitemap.xml exists and lists the URL; self-referential canonical; `/llms.txt` exists and is well-structured; RSS/Atom feed |
| Structure | 15 | exactly one H1; no skipped heading levels; lists/tables present; an FAQ section; enough content depth; semantic landmarks |
| Schema | 12 | JSON-LD present and valid; Organization/WebSite; a page-type schema; FAQPage; Open Graph tags; `sameAs` links |
| Factual Density | 13 | numbers per 1k words; percentages; dates/years; sourcing phrases ("according to"); concrete units |
| Entity Clarity | 10 | brand name in title / H1 / meta description / first paragraph; title & description well-formed; About/Contact links |
| Freshness | 10 | schema dates; a visible date; current year in copy; content < 12 months old; site updated recently (sitemap lastmod) |
| First Answer | 15 | (LLM-scored) the first ~80 words directly answer the page topic; the title maps to a real question |

## Gating flags (cap the overall score)

- **AI bots blocked** — robots.txt blocks all of ChatGPT/Perplexity/Claude crawlers → score capped at 25.
- **noindex** — the page is `noindex` → capped at 30.
- **Not analyzable** — HTTP error → capped at 0; SPA shell → capped at 60, `status: limited`.

## How to read a result

Fix in this order: triggered **gating flags** → `critical`/`high` issues →
`medium` → `low`. The `issues[]` array is already sorted, so work top-down.
A dimension at a low `percent` with a high `weight` (Structure, First Answer)
moves the score the most.

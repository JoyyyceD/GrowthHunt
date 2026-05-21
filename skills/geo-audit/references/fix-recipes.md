# Fix Recipes

Copy-paste templates for the **generation-type** fixes this skill applies.
Always replace the placeholder values with real, accurate content — never invent
facts. Show a diff and get confirmation before writing.

## 1. Metadata (title / description / canonical / Open Graph)

**Next.js App Router** — in `app/<route>/page.tsx` or `layout.tsx`:

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Concrete, question-shaped title — 10-70 chars',
  description: 'A 50-160 char summary that names the product and the problem it solves.',
  alternates: { canonical: 'https://example.com/this-page' },
  openGraph: {
    type: 'website',
    url: 'https://example.com/this-page',
    title: 'Same as title',
    description: 'Same as description',
  },
}
```

**Static HTML** — in `<head>`:

```html
<title>Concrete, question-shaped title</title>
<meta name="description" content="50-160 char summary." />
<link rel="canonical" href="https://example.com/this-page" />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:type" content="website" />
```

## 2. JSON-LD structured data

Inject a `<script type="application/ld+json">` (Next.js: render it in the
component with `dangerouslySetInnerHTML`). Pick the type that fits the page.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Product Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": ["https://x.com/handle", "https://github.com/org"]
}
```

Page-type examples: `Article` / `BlogPosting` (add `headline`, `datePublished`,
`dateModified`, `author`), `SoftwareApplication` (add `applicationCategory`,
`offers`), `Product`, `FAQPage`.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Question text?",
      "acceptedAnswer": { "@type": "Answer", "text": "Answer text." } }
  ]
}
```

## 3. robots.txt — unblock AI crawlers

Allow the citation crawlers. The recommended pattern allows search/citation
bots while optionally blocking training-only bots:

```
User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Remove any `Disallow: /` rule that targets these user-agents.

## 4. llms.txt

Create `/llms.txt` (Next.js: `public/llms.txt`). Structure: H1 site name →
blockquote summary → `##` sections with descriptive links. Keep under 200 lines.

```
# Product Name

> One-sentence description of what the product is and who it is for.

## Docs
- [Getting started](https://example.com/docs/start): how to set up in 5 minutes.
- [API reference](https://example.com/docs/api): endpoints and auth.

## Key pages
- [Pricing](https://example.com/pricing): plans and what each includes.
```

## Out of scope — recommend, do not auto-apply

Rewriting the opening 80 words, writing FAQ answers, adding statistics or
citations, changing claims. These are **rewrite-type** fixes — surface them as
recommendations; only draft them if the user explicitly asks.

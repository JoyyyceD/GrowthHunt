/**
 * Shared lightweight page fetcher for agents.
 *
 * Not as full-featured as lib/audit/fetch.ts (which uses cheerio + SPA
 * detection) — agents only need title / meta / h1-h3 / visible text. We
 * keep this regex-based to avoid pulling cheerio into every agent module.
 */
const TIMEOUT_MS = 8_000
const MAX_BYTES = 500_000

export interface PageSnapshot {
  url: string
  title: string
  description: string
  h1: string
  headings: string[]
  text: string         // visible text, scripts/styles stripped, capped to ~3k chars
  ogSiteName?: string
  twitterCreator?: string
  fetchedAt: string
  status: number
}

const USER_AGENT = 'GrowthHuntAgent/1.0 (+https://growthhunt.ai)'

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function meta(html: string, name: string): string {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
  return decodeEntities(html.match(re)?.[1] || '').trim()
}

export async function fetchPageSnapshot(url: string): Promise<PageSnapshot> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*' },
      redirect: 'follow',
    })
    const reader = res.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder()
      let total = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BYTES) { controller.abort(); break }
        html += decoder.decode(value, { stream: true })
      }
    } else {
      html = await res.text()
    }

    const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    const description = meta(html, 'description') || meta(html, 'og:description')
    const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')

    const headings: string[] = []
    for (const m of html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      const t = stripTags(m[2] || '')
      if (t && headings.length < 30) headings.push(t)
    }

    // crude visible-text extraction: drop scripts/styles, then strip tags
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html
    const cleaned = bodyMatch
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    const text = stripTags(cleaned).slice(0, 3000)

    return {
      url,
      title,
      description,
      h1,
      headings,
      text,
      ogSiteName: meta(html, 'og:site_name') || undefined,
      twitterCreator: meta(html, 'twitter:creator') || undefined,
      fetchedAt: new Date().toISOString(),
      status: res.status,
    }
  } finally {
    clearTimeout(timer)
  }
}

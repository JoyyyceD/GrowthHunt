/**
 * Sitemap discovery + parsing.
 *
 * Strategy:
 *   1. Try /sitemap.xml on the domain.
 *   2. If it's a sitemap-index (links to other sitemaps), pull the first N.
 *   3. Return up to MAX_URLS URLs in lastmod-desc order, same-origin only.
 *
 * Parser is regex-based to avoid an XML lib dependency; sitemaps are simple
 * enough for that to be safe.
 */
const TIMEOUT_MS = 8_000
const MAX_URLS = 30
const MAX_INDEX_CHILDREN = 3

const USER_AGENT = 'GrowthHuntGEO/1.0 (+https://growthhunt.ai/geo)'

interface SitemapEntry {
  loc: string
  lastmod?: string
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml,text/xml,*/*' },
    })
    if (!res.ok) return null
    const text = await res.text()
    if (text.length > 5_000_000) return null  // 5MB safety cap
    return text
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function parseUrls(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = []
  const urlBlocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) || []
  for (const block of urlBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim()
    if (!loc) continue
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim()
    out.push({ loc, lastmod })
  }
  return out
}

function parseIndex(xml: string): string[] {
  const out: string[] = []
  const blocks = xml.match(/<sitemap\b[\s\S]*?<\/sitemap>/gi) || []
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim()
    if (loc) out.push(loc)
  }
  return out
}

function sameOrigin(url: string, origin: string): boolean {
  try { return new URL(url).origin === origin } catch { return false }
}

function sortByLastmodDesc(entries: SitemapEntry[]): SitemapEntry[] {
  return [...entries].sort((a, b) => {
    const ta = a.lastmod ? Date.parse(a.lastmod) : 0
    const tb = b.lastmod ? Date.parse(b.lastmod) : 0
    return tb - ta
  })
}

export interface SitemapDiscovery {
  sitemapUrl: string
  origin: string
  urls: string[]
}

/** Discover and parse a domain's sitemap, returning the first MAX_URLS URLs. */
export async function discoverSitemap(rawDomain: string): Promise<SitemapDiscovery | null> {
  let origin: string
  try {
    const u = new URL(rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`)
    origin = u.origin
  } catch {
    return null
  }

  const sitemapUrl = `${origin}/sitemap.xml`
  const xml = await fetchText(sitemapUrl)
  if (!xml) return null

  const looksLikeIndex = /<sitemapindex/i.test(xml)
  let all: SitemapEntry[] = []
  if (looksLikeIndex) {
    const children = parseIndex(xml).slice(0, MAX_INDEX_CHILDREN)
    for (const childUrl of children) {
      if (!sameOrigin(childUrl, origin)) continue
      const childXml = await fetchText(childUrl)
      if (childXml) all.push(...parseUrls(childXml))
    }
  } else {
    all = parseUrls(xml)
  }

  const sorted = sortByLastmodDesc(all)
  const seen = new Set<string>()
  const urls: string[] = []
  for (const e of sorted) {
    if (!sameOrigin(e.loc, origin)) continue
    if (seen.has(e.loc)) continue
    seen.add(e.loc)
    urls.push(e.loc)
    if (urls.length >= MAX_URLS) break
  }
  if (urls.length === 0) return null
  return { sitemapUrl, origin, urls }
}

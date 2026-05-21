/**
 * GEO audit — page fetch & parse layer.
 *
 * Plain `fetch` + cheerio. No JavaScript execution: pages that render
 * client-side are detected and flagged as SPAs so the engine can return an
 * honest "limited analysis" result instead of a misleading low score.
 */
import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import type { AuditContext, FetchedResource } from './types'

const USER_AGENT = 'GrowthHuntGEO/1.0 (+https://growthhunt.ai/geo)'
const PAGE_TIMEOUT_MS = 10_000
const RESOURCE_TIMEOUT_MS = 6_000
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

export type FetchErrorKind = 'network' | 'timeout' | 'too_large'

export class FetchError extends Error {
  constructor(message: string, readonly kind: FetchErrorKind) {
    super(message)
    this.name = 'FetchError'
  }
}

interface RawFetch {
  status: number
  headers: Record<string, string>
  text: string
}

async function rawFetch(url: string, timeoutMs: number): Promise<RawFetch> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
    })

    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })

    let text = ''
    const reader = res.body?.getReader()
    if (reader) {
      const decoder = new TextDecoder()
      let total = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BYTES) {
          controller.abort()
          throw new FetchError('Page exceeds the 2MB analysis limit', 'too_large')
        }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
    } else {
      text = await res.text()
    }

    return { status: res.status, headers, text }
  } catch (err) {
    if (err instanceof FetchError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new FetchError('Request timed out', 'timeout')
    }
    throw new FetchError((err as Error).message || 'Network error', 'network')
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch the main page with a single retry on network/timeout failure. */
async function fetchWithRetry(url: string, timeoutMs: number): Promise<RawFetch> {
  try {
    return await rawFetch(url, timeoutMs)
  } catch (err) {
    if (err instanceof FetchError && err.kind !== 'too_large') {
      return await rawFetch(url, timeoutMs)
    }
    throw err
  }
}

/** Best-effort fetch of an auxiliary resource — never throws. */
async function fetchResource(url: string): Promise<FetchedResource> {
  try {
    const r = await rawFetch(url, RESOURCE_TIMEOUT_MS)
    return {
      found: r.status >= 200 && r.status < 300 && r.text.trim().length > 0,
      status: r.status,
      text: r.text,
    }
  } catch {
    return { found: false, status: 0, text: '' }
  }
}

/** Normalize user input into a canonical, hashable URL. */
export function normalizeUrl(input: string): string {
  let u = input.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  const parsed = new URL(u)
  parsed.hash = ''
  return parsed.toString()
}

/** Visible text content with scripts/styles stripped. */
function extractText(html: string): string {
  const $ = cheerio.load(html)
  $('script,style,noscript,template,svg,iframe').remove()
  const body = $('body').text() || $.root().text()
  return body.replace(/\s+/g, ' ').trim()
}

/**
 * Heuristic SPA detection. The server returned HTML, but the body carries
 * almost no real text and is dominated by a JS bundle / single mount node —
 * meaning the real content renders client-side and our no-JS fetch can't
 * see it. Only fires on low word counts, so server-rendered content pages
 * (even Next.js ones with `#__next`) are never misclassified.
 */
function detectSPA($: CheerioAPI, wordCount: number): boolean {
  if (wordCount >= 120) return false
  const scriptCount = $('script[src]').length
  const rootMount = $('#root, #app, #__next, [data-reactroot], [data-server-rendered]').length > 0
  const bodyChildren = $('body').children().not('script,noscript,style,link').length
  return scriptCount >= 1 && (rootMount || bodyChildren <= 2)
}

/** Fetch a URL and build the full AuditContext consumed by every dimension. */
export async function fetchAndParse(inputUrl: string): Promise<AuditContext> {
  const normalizedUrl = normalizeUrl(inputUrl)
  const origin = new URL(normalizedUrl).origin

  const page = await fetchWithRetry(normalizedUrl, PAGE_TIMEOUT_MS)
  const $ = cheerio.load(page.text)
  const text = extractText(page.text)
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0
  const isSPA = detectSPA($, wordCount)

  const [robotsTxt, sitemapXml, llmsTxt] = await Promise.all([
    fetchResource(`${origin}/robots.txt`),
    fetchResource(`${origin}/sitemap.xml`),
    fetchResource(`${origin}/llms.txt`),
  ])

  return {
    url: inputUrl,
    normalizedUrl,
    origin,
    status: page.status,
    headers: page.headers,
    html: page.text,
    $,
    text,
    wordCount,
    isSPA,
    robotsTxt,
    sitemapXml,
    llmsTxt,
  }
}

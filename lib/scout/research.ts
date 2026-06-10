/**
 * Scout research layer — "find" (Serper = Google results) and "read" (Jina
 * Reader = any URL to clean markdown). Decision 7.6: Serper + Jina, with the
 * existing cheerio page-fetch as a last-resort fallback for reads.
 */
import { fetchPageSnapshot } from '@/lib/agents/page-fetch'

export interface SearchResult {
  title: string
  link: string
  snippet: string
}

export interface SearchResponse {
  answerBox?: string
  results: SearchResult[]
}

export async function webSearch(q: string, num = 6, fetchImpl: typeof fetch = fetch): Promise<SearchResponse> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error('Missing SERPER_API_KEY')
  const res = await fetchImpl('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, num }),
  })
  if (!res.ok) throw new Error(`Serper ${res.status}`)
  const data = await res.json()
  const answer = data.answerBox?.snippet || data.answerBox?.answer
  return {
    answerBox: typeof answer === 'string' ? answer : undefined,
    results: (data.organic || []).slice(0, num).map((r: Record<string, unknown>) => ({
      title: String(r.title || ''),
      link: String(r.link || ''),
      snippet: String(r.snippet || ''),
    })),
  }
}

export interface PageRead {
  url: string
  title: string
  markdown: string
  source: 'jina' | 'page-fetch'
}

const JINA_TIMEOUT_MS = 30_000
const MAX_PAGE_CHARS = 20_000

/** Read a page as clean markdown via Jina Reader; fall back to cheerio fetch. */
export async function readPage(url: string, fetchImpl: typeof fetch = fetch): Promise<PageRead> {
  const apiKey = process.env.JINA_API_KEY
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
  if (apiKey) {
    try {
      const res = await fetchImpl(`https://r.jina.ai/${normalized}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
      })
      if (res.ok) {
        const text = await res.text()
        const titleMatch = text.match(/^Title:\s*(.+)$/m)
        return {
          url: normalized,
          title: titleMatch?.[1]?.trim() || normalized,
          markdown: text.slice(0, MAX_PAGE_CHARS),
          source: 'jina',
        }
      }
    } catch {
      // fall through to page-fetch
    }
  }
  const snap = await fetchPageSnapshot(normalized)
  return {
    url: normalized,
    title: snap?.title || normalized,
    markdown: [snap?.title, snap?.headings?.join('\n'), snap?.text].filter(Boolean).join('\n\n').slice(0, MAX_PAGE_CHARS),
    source: 'page-fetch',
  }
}

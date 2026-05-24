/**
 * Anthropic Claude adapter — uses Messages API with `web_search` tool.
 * Source URLs come back inside `content[].citations[].url`.
 *
 * Requires ANTHROPIC_API_KEY.
 */
import type { EngineCitationResult } from './types'
import { domainMatches } from './queries'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.ANTHROPIC_SEARCH_MODEL || 'claude-haiku-4-5-20251001'
const TIMEOUT_MS = 30_000

interface Citation {
  type?: string
  url?: string
}
interface ContentBlock {
  type?: string
  text?: string
  citations?: Citation[]
}
interface ClaudeResponse {
  content?: ContentBlock[]
}

export async function claudeCite(query: string, domain: string): Promise<EngineCitationResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return { engine: 'claude', query, available: false, cited: false, citedUrls: [] }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: query }],
      }),
    })
    if (!res.ok) {
      return { engine: 'claude', query, available: true, cited: false, citedUrls: [], error: `HTTP ${res.status}` }
    }
    const data = await res.json() as ClaudeResponse
    const urls: string[] = []
    let answer = ''
    for (const block of data.content || []) {
      if (typeof block.text === 'string') answer += block.text
      for (const c of block.citations || []) {
        if (c.url) urls.push(c.url)
      }
    }
    const unique = Array.from(new Set(urls))
    const cited = unique.some((u) => domainMatches(u, domain))
    return {
      engine: 'claude',
      query,
      available: true,
      cited,
      citedUrls: unique,
      answerSnippet: answer.slice(0, 200),
    }
  } catch (err) {
    return {
      engine: 'claude',
      query,
      available: true,
      cited: false,
      citedUrls: [],
      error: (err as Error).message,
    }
  } finally {
    clearTimeout(timer)
  }
}

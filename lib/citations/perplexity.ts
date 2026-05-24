/**
 * Perplexity adapter — Sonar API returns a `citations: string[]` array
 * inline with the chat response, so this is the cheapest live-citation
 * signal we can collect.
 *
 * Requires PERPLEXITY_API_KEY. Returns `{available: false}` when missing
 * so the caller can render a "skipped" cell instead of failing the run.
 */
import type { EngineCitationResult } from './types'
import { domainMatches } from './queries'

const ENDPOINT = 'https://api.perplexity.ai/chat/completions'
const MODEL = process.env.PERPLEXITY_MODEL || 'sonar'
const TIMEOUT_MS = 25_000

export async function perplexityCite(query: string, domain: string): Promise<EngineCitationResult> {
  const key = process.env.PERPLEXITY_API_KEY
  if (!key) {
    return { engine: 'perplexity', query, available: false, cited: false, citedUrls: [] }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Be concise. Cite sources.' },
          { role: 'user', content: query },
        ],
        temperature: 0,
        max_tokens: 350,
      }),
    })
    if (!res.ok) {
      return { engine: 'perplexity', query, available: true, cited: false, citedUrls: [], error: `HTTP ${res.status}` }
    }
    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
      citations?: string[]
      // newer Sonar responses sometimes nest citations under each choice
    }
    const answer = data.choices?.[0]?.message?.content || ''
    const citations = Array.isArray(data.citations) ? data.citations.filter((c): c is string => typeof c === 'string') : []
    const unique = Array.from(new Set(citations))
    const cited = unique.some((u) => domainMatches(u, domain))
    return {
      engine: 'perplexity',
      query,
      available: true,
      cited,
      citedUrls: unique,
      answerSnippet: answer.slice(0, 200),
    }
  } catch (err) {
    return {
      engine: 'perplexity',
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

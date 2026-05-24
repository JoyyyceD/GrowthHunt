/**
 * OpenAI adapter — uses the Responses API with the `web_search` tool,
 * which is the only chat-style surface that returns inline citations.
 *
 * Requires OPENAI_API_KEY. Model defaults to gpt-4o-mini for cost.
 */
import type { EngineCitationResult } from './types'
import { domainMatches } from './queries'

const ENDPOINT = 'https://api.openai.com/v1/responses'
const MODEL = process.env.OPENAI_SEARCH_MODEL || 'gpt-4o-mini'
const TIMEOUT_MS = 30_000

interface ResponseUrlAnnotation {
  type?: string
  url?: string
}
interface ResponseContent {
  type?: string
  text?: string
  annotations?: ResponseUrlAnnotation[]
}
interface ResponseOutputItem {
  type?: string
  content?: ResponseContent[]
}

export async function openaiCite(query: string, domain: string): Promise<EngineCitationResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return { engine: 'openai', query, available: false, cited: false, citedUrls: [] }
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
        tools: [{ type: 'web_search' }],
        input: query,
      }),
    })
    if (!res.ok) {
      return { engine: 'openai', query, available: true, cited: false, citedUrls: [], error: `HTTP ${res.status}` }
    }
    const data = await res.json() as { output?: ResponseOutputItem[]; output_text?: string }
    const urls: string[] = []
    let answer = ''
    for (const item of data.output || []) {
      for (const c of item.content || []) {
        if (typeof c.text === 'string') answer += c.text
        for (const ann of c.annotations || []) {
          if (ann.url) urls.push(ann.url)
        }
      }
    }
    if (!answer && typeof data.output_text === 'string') answer = data.output_text
    const unique = Array.from(new Set(urls))
    const cited = unique.some((u) => domainMatches(u, domain))
    return {
      engine: 'openai',
      query,
      available: true,
      cited,
      citedUrls: unique,
      answerSnippet: answer.slice(0, 200),
    }
  } catch (err) {
    return {
      engine: 'openai',
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

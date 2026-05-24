/**
 * Gemini adapter — uses generateContent with Google Search grounding. The
 * grounding metadata returns `groundingChunks[].web.uri` for each citation.
 *
 * Requires GEMINI_API_KEY.
 */
import type { EngineCitationResult } from './types'
import { domainMatches } from './queries'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
const TIMEOUT_MS = 30_000

interface GroundingChunk {
  web?: { uri?: string; title?: string }
}
interface Candidate {
  content?: { parts?: Array<{ text?: string }> }
  groundingMetadata?: { groundingChunks?: GroundingChunk[] }
}
interface GeminiResponse {
  candidates?: Candidate[]
}

export async function geminiCite(query: string, domain: string): Promise<EngineCitationResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return { engine: 'gemini', query, available: false, cited: false, citedUrls: [] }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT(MODEL, key), {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
        tools: [{ google_search: {} }],
      }),
    })
    if (!res.ok) {
      return { engine: 'gemini', query, available: true, cited: false, citedUrls: [], error: `HTTP ${res.status}` }
    }
    const data = await res.json() as GeminiResponse
    const cand = data.candidates?.[0]
    const answer = (cand?.content?.parts || []).map((p) => p.text || '').join('')
    const urls: string[] = []
    for (const chunk of cand?.groundingMetadata?.groundingChunks || []) {
      if (chunk.web?.uri) urls.push(chunk.web.uri)
    }
    const unique = Array.from(new Set(urls))
    const cited = unique.some((u) => domainMatches(u, domain))
    return {
      engine: 'gemini',
      query,
      available: true,
      cited,
      citedUrls: unique,
      answerSnippet: answer.slice(0, 200),
    }
  } catch (err) {
    return {
      engine: 'gemini',
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

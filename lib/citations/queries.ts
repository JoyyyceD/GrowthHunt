/**
 * Query derivation — given a page (title + meta + first H1), produce a
 * small set of natural-language questions an AI answer engine might be
 * asked where this page *should* show up as a source.
 *
 * Uses MiniMax (the project's only configured LLM). Falls back to a
 * heuristic when no key is set so /api/geo/citations still returns
 * something deterministic.
 */
import { minimaxChat } from '@/lib/viralx/minimax'

export const DEFAULT_QUERY_COUNT = 6
const MAX_QUERY_COUNT = 10

/** Strip protocol and `www.` so `domainMatches` can compare like-for-like. */
export function canonicalDomain(input: string): string {
  let s = input.trim().toLowerCase()
  s = s.replace(/^https?:\/\//, '')
  s = s.replace(/^www\./, '')
  s = s.split('/')[0] ?? s
  return s
}

/** True when `candidateUrl` lives on (or below) `targetDomain`. */
export function domainMatches(candidateUrl: string, targetDomain: string): boolean {
  if (!candidateUrl || !targetDomain) return false
  try {
    const u = new URL(candidateUrl)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    const target = canonicalDomain(targetDomain)
    return host === target || host.endsWith(`.${target}`)
  } catch {
    return false
  }
}

interface DeriveInput {
  title?: string
  description?: string
  h1?: string
  url: string
  brand?: string
}

function extractJsonArray(raw: string | null): string[] | null {
  if (!raw) return null
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    const arr = JSON.parse(match[0]) as unknown
    if (!Array.isArray(arr)) return null
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  } catch {
    return null
  }
}

function heuristicQueries(inp: DeriveInput): string[] {
  const brand = inp.brand || canonicalDomain(inp.url).split('.')[0]
  const topic = inp.title || inp.description || inp.h1 || brand
  const cleanTopic = topic.replace(/[—|:].*$/, '').trim().slice(0, 80)
  return [
    `What is ${brand}?`,
    `How does ${brand} work?`,
    `${brand} reviews and pricing`,
    `Best tools for ${cleanTopic}`,
    `Alternatives to ${brand}`,
    `Is ${brand} worth it?`,
  ]
}

export async function deriveQueries(input: DeriveInput, count = DEFAULT_QUERY_COUNT): Promise<string[]> {
  const n = Math.min(MAX_QUERY_COUNT, Math.max(2, count))
  const heuristic = heuristicQueries(input).slice(0, n)

  if (!process.env.MINIMAX_API_KEY) return heuristic

  const system =
    'You generate the natural-language questions a real user types into ChatGPT, '
    + 'Perplexity, Gemini or Claude when researching a product or topic. Reply with '
    + 'ONLY a JSON array of strings, no prose.'

  const user = [
    `Page URL: ${input.url}`,
    `Brand: ${input.brand || ''}`,
    `Title: ${input.title || ''}`,
    `Meta description: ${input.description || ''}`,
    `H1: ${input.h1 || ''}`,
    '',
    `Generate ${n} distinct natural-language queries an AI answer engine would receive where THIS page should be a top source. Mix:`,
    '  - "What is X" / "How does X work" definitional queries',
    '  - Category queries ("best tools for ...", "top alternatives to ...")',
    '  - Comparison queries ("X vs Y" only if a sensible competitor exists)',
    '  - One narrow long-tail query the page uniquely answers',
    '',
    'Constraints: 5-12 words each, no quotes, no numbering. Reply: ["...", "...", ...]',
  ].join('\n')

  try {
    const raw = await minimaxChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      maxTokens: 500,
    })
    const parsed = extractJsonArray(raw)
    if (!parsed || parsed.length === 0) return heuristic
    return parsed.slice(0, n)
  } catch (err) {
    console.error('[citations] deriveQueries failed:', (err as Error).message)
    return heuristic
  }
}

/**
 * LLM layer — Claude Haiku 4.5, temperature 0.
 *
 * Two calls per audit: (1) score the First Answer dimension, (2) synthesize
 * a prioritized issue list. Both degrade gracefully — a missing API key or a
 * failed call never breaks an audit, it just falls back to heuristics.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { AuditContext, CheckStatus, Issue, Severity } from './types'

const MODEL = 'claude-haiku-4-5-20251001'

let client: Anthropic | null = null

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (!client) client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 })
  return client
}

async function callHaiku(system: string, user: string, maxTokens: number): Promise<string | null> {
  const c = getClient()
  if (!c) return null
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const parts: string[] = []
    for (const block of msg.content) {
      if (block.type === 'text') parts.push(block.text)
    }
    return parts.join('')
  } catch (err) {
    console.error('[geo-audit] Haiku call failed:', (err as Error).message)
    return null
  }
}

/** Pull the first JSON object/array out of a model response. */
function extractJson<T>(raw: string | null): T | null {
  if (!raw) return null
  const match = raw.match(/[[{][\s\S]*[\]}]/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

// ── First Answer scoring ──

export interface FirstAnswerOutcome {
  status: CheckStatus
  reason: string
}

export interface FirstAnswerResult {
  directAnswer: FirstAnswerOutcome
  titleIsQuery: FirstAnswerOutcome
}

function coerceStatus(v: unknown): CheckStatus {
  return v === 'pass' || v === 'partial' || v === 'fail' ? v : 'partial'
}

/** Heuristic fallback when the LLM is unavailable. */
function heuristicFirstAnswer(ctx: AuditContext): FirstAnswerResult {
  const opening = ctx.text.split(/\s+/).slice(0, 80).join(' ')
  const defines = /\b(is|are|helps?|lets?|gives?|provides?|builds?|turns?)\b/i.test(opening.slice(0, 200))
  const enough = opening.split(/\s+/).filter(Boolean).length >= 40
  return {
    directAnswer: {
      status: enough && defines ? 'partial' : 'fail',
      reason: 'Heuristic estimate (LLM scoring unavailable).',
    },
    titleIsQuery: {
      status: 'partial',
      reason: 'Heuristic estimate (LLM scoring unavailable).',
    },
  }
}

export async function scoreFirstAnswer(ctx: AuditContext): Promise<FirstAnswerResult> {
  const title = ctx.$('title').first().text().trim()
  const h1 = ctx.$('h1').first().text().trim()
  const opening = ctx.text.split(/\s+/).slice(0, 130).join(' ')

  if (!opening || ctx.isSPA) return heuristicFirstAnswer(ctx)

  const system =
    'You are a GEO (Generative Engine Optimization) auditor. AI answer engines '
    + 'prefer pages that state, up front, exactly what they are about. Judge two '
    + 'things and reply with ONLY a JSON object, no prose.'

  const user = [
    `URL: ${ctx.url}`,
    `Title: ${title || '(none)'}`,
    `H1: ${h1 || '(none)'}`,
    `Opening text (first ~130 words):\n"""${opening}"""`,
    '',
    'Return JSON exactly:',
    '{',
    '  "direct_answer": {"status": "pass|partial|fail", "reason": "<=20 words"},',
    '  "title_is_query": {"status": "pass|partial|fail", "reason": "<=20 words"}',
    '}',
    '',
    'direct_answer: does the first ~80 words directly state what the page/product is and what problem it solves? pass = yes clearly; partial = vague; fail = no.',
    'title_is_query: does the title match a real question or search a user would type? pass = yes; partial = loosely; fail = generic/branding-only.',
  ].join('\n')

  const parsed = extractJson<{
    direct_answer?: { status?: string; reason?: string }
    title_is_query?: { status?: string; reason?: string }
  }>(await callHaiku(system, user, 400))

  if (!parsed) return heuristicFirstAnswer(ctx)

  return {
    directAnswer: {
      status: coerceStatus(parsed.direct_answer?.status),
      reason: parsed.direct_answer?.reason || 'Scored by Claude Haiku.',
    },
    titleIsQuery: {
      status: coerceStatus(parsed.title_is_query?.status),
      reason: parsed.title_is_query?.reason || 'Scored by Claude Haiku.',
    },
  }
}

// ── Issue synthesis ──

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

function coerceSeverity(v: unknown): Severity {
  return SEVERITIES.includes(v as Severity) ? (v as Severity) : 'medium'
}

/**
 * Rewrite the deterministic issue list into a tighter, merged, prioritized
 * punch list. Returns the deterministic list unchanged if the LLM is
 * unavailable or the response can't be parsed.
 */
export async function synthesizeIssues(deterministic: Issue[], ctx: AuditContext): Promise<Issue[]> {
  if (deterministic.length === 0) return deterministic

  const system =
    'You are a GEO auditor writing a fix punch list for an indie developer. '
    + 'Merge related items, keep it concrete and prioritized, and reply with ONLY a JSON array.'

  const user = [
    `Page: ${ctx.url}`,
    '',
    'Raw issues found by the audit engine:',
    JSON.stringify(deterministic.slice(0, 16), null, 2),
    '',
    'Return a JSON array of at most 10 objects, highest priority first:',
    '[{',
    '  "severity": "critical|high|medium|low",',
    '  "dimension": "<keep the source dimension id>",',
    '  "title": "<short imperative fix>",',
    '  "explanation": "<=30 words, why it matters for AI citation",',
    '  "fix_suggestion": "<=40 words, concrete action"',
    '}]',
  ].join('\n')

  const parsed = extractJson<Array<Record<string, unknown>>>(await callHaiku(system, user, 1600))
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return deterministic

  return parsed.slice(0, 10).map((it) => ({
    severity: coerceSeverity(it['severity']),
    dimension: typeof it['dimension'] === 'string' ? (it['dimension'] as string) : 'general',
    title: typeof it['title'] === 'string' ? (it['title'] as string) : 'Fix issue',
    explanation: typeof it['explanation'] === 'string' ? (it['explanation'] as string) : '',
    fix_suggestion: typeof it['fix_suggestion'] === 'string' ? (it['fix_suggestion'] as string) : '',
  }))
}

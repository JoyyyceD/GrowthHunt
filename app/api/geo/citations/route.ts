/**
 * POST /api/geo/citations
 *
 * Body: { url: string, queries?: string[], engines?: EngineId[] }
 *
 * Runs the live AI citation check (Perplexity / OpenAI / Gemini / Claude),
 * gated by per-day usage so it can't be abused. Citation runs are expensive
 * (real LLM calls with web search), so the limit is stricter than the regular
 * /api/audit endpoint.
 */
import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl } from '@/lib/audit'
import { runCitationCheck, type EngineId } from '@/lib/citations'
import { ALL_ENGINES } from '@/lib/citations/types'
import { checkUsage } from '@/lib/geo/usage'
import { getClientIp, ipHash } from '@/lib/ip-hash'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CITATION_DAILY_LIMIT_ANON = 1
const CITATION_DAILY_LIMIT_EMAIL = 5
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function sanitizeEngines(raw: unknown): EngineId[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const allowed = new Set<EngineId>(ALL_ENGINES)
  const out: EngineId[] = []
  for (const v of raw) {
    if (typeof v === 'string' && allowed.has(v as EngineId)) out.push(v as EngineId)
  }
  return out.length > 0 ? out : undefined
}

function sanitizeQueries(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: string[] = []
  for (const v of raw) {
    if (typeof v === 'string') {
      const t = v.trim()
      if (t.length >= 3 && t.length <= 200) out.push(t)
    }
    if (out.length >= 10) break
  }
  return out.length > 0 ? out : undefined
}

export async function POST(req: NextRequest) {
  let body: { url?: string; email?: string; queries?: unknown; engines?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = (body.url || '').trim()
  if (!rawUrl) return NextResponse.json({ error: 'Please enter a URL' }, { status: 400 })

  let normalized: string
  try {
    normalized = normalizeUrl(rawUrl)
  } catch {
    return NextResponse.json({ error: 'That does not look like a valid URL' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const hasEmail = EMAIL_RE.test(email)

  try {
    const key = hasEmail ? `cite-e:${ipHash(email)}` : `cite-ip:${ipHash(getClientIp(req))}`
    const limit = hasEmail ? CITATION_DAILY_LIMIT_EMAIL : CITATION_DAILY_LIMIT_ANON
    const usage = await checkUsage(key, limit)
    if (!usage.allowed) {
      return NextResponse.json(
        { error: 'limit', used: usage.used, limit: usage.limit, emailUnlock: !hasEmail },
        { status: 429 },
      )
    }
  } catch {
    // DAILY_SALT_BASE missing — degrade open.
  }

  try {
    const run = await runCitationCheck({
      url: normalized,
      queries: sanitizeQueries(body.queries),
      engines: sanitizeEngines(body.engines),
    })
    return NextResponse.json({ run })
  } catch (err) {
    console.error('[geo] citation check failed:', (err as Error).message)
    return NextResponse.json({ error: 'The citation check failed. Please try again.' }, { status: 500 })
  }
}

/**
 * POST /api/geo/compete
 *
 * Body: { primary: string, competitors: string[] }   // up to 3 competitors
 *
 * Runs runAudit on all 4 URLs in parallel and returns the audits side-by-side.
 * Uses the shared 24h audit cache so repeated calls don't re-fetch. Rate
 * limited per IP/email like the single-URL endpoint.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runAudit, normalizeUrl } from '@/lib/audit'
import type { AuditResult } from '@/lib/audit'
import { getCachedAudit, saveAudit } from '@/lib/geo/cache'
import { checkUsage } from '@/lib/geo/usage'
import { saveSubscriber } from '@/lib/geo/subscribers'
import { getClientIp, ipHash } from '@/lib/ip-hash'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const COMPETE_DAILY_LIMIT_ANON = 1
const COMPETE_DAILY_LIMIT_EMAIL = 3
const MAX_COMPETITORS = 3
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function auditWithCache(url: string): Promise<AuditResult> {
  const cached = await getCachedAudit(url)
  if (cached) return cached
  const result = await runAudit(url)
  if (result.status !== 'error') await saveAudit(url, result)
  return result
}

export async function POST(req: NextRequest) {
  let body: { primary?: string; competitors?: unknown; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawPrimary = (body.primary || '').trim()
  if (!rawPrimary) return NextResponse.json({ error: 'Please enter your URL' }, { status: 400 })

  let normalizedPrimary: string
  try {
    normalizedPrimary = normalizeUrl(rawPrimary)
  } catch {
    return NextResponse.json({ error: 'Your URL looks invalid' }, { status: 400 })
  }

  const rawCompetitors = Array.isArray(body.competitors) ? body.competitors : []
  const normalizedCompetitors: string[] = []
  for (const raw of rawCompetitors) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    try {
      const n = normalizeUrl(trimmed)
      if (!normalizedCompetitors.includes(n) && n !== normalizedPrimary) {
        normalizedCompetitors.push(n)
      }
    } catch {
      return NextResponse.json({ error: `Competitor "${trimmed}" looks invalid` }, { status: 400 })
    }
    if (normalizedCompetitors.length >= MAX_COMPETITORS) break
  }

  if (normalizedCompetitors.length === 0) {
    return NextResponse.json({ error: 'Please enter at least one competitor URL' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const hasEmail = EMAIL_RE.test(email)

  try {
    const key = hasEmail ? `cmp-e:${ipHash(email)}` : `cmp-ip:${ipHash(getClientIp(req))}`
    const limit = hasEmail ? COMPETE_DAILY_LIMIT_EMAIL : COMPETE_DAILY_LIMIT_ANON
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

  if (hasEmail) void saveSubscriber(email, 'geo-compete')

  const all = [normalizedPrimary, ...normalizedCompetitors]
  const settled = await Promise.allSettled(all.map((u) => auditWithCache(u)))

  const audits = settled.map((r, i) => ({
    url: all[i],
    role: i === 0 ? 'primary' as const : 'competitor' as const,
    ok: r.status === 'fulfilled',
    result: r.status === 'fulfilled' ? r.value : null,
    error: r.status === 'rejected' ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : null,
  }))

  return NextResponse.json({ audits })
}

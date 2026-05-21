import { NextRequest, NextResponse } from 'next/server'
import { runAudit, normalizeUrl } from '@/lib/audit'
import { getCachedAudit, saveAudit } from '@/lib/geo/cache'
import { checkUsage, ANON_DAILY_LIMIT, EMAIL_DAILY_LIMIT } from '@/lib/geo/usage'
import { saveSubscriber } from '@/lib/geo/subscribers'
import { getClientIp, ipHash } from '@/lib/ip-hash'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { url?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = (body.url || '').trim()
  if (!rawUrl) {
    return NextResponse.json({ error: 'Please enter a URL to audit' }, { status: 400 })
  }

  let normalized: string
  try {
    normalized = normalizeUrl(rawUrl)
  } catch {
    return NextResponse.json({ error: 'That does not look like a valid URL' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const hasEmail = EMAIL_RE.test(email)

  // 1. Cache — cached results are free and instant (re-checks don't count).
  const cached = await getCachedAudit(normalized)
  if (cached) {
    return NextResponse.json({ result: cached, cached: true })
  }

  // 2. Rate limit. Anonymous: 3 new audits / IP / day. With an email: 10 / day.
  try {
    const key = hasEmail ? `e:${ipHash(email)}` : `ip:${ipHash(getClientIp(req))}`
    const limit = hasEmail ? EMAIL_DAILY_LIMIT : ANON_DAILY_LIMIT
    const usage = await checkUsage(key, limit)
    if (!usage.allowed) {
      return NextResponse.json(
        { error: 'limit', used: usage.used, limit: usage.limit, emailUnlock: !hasEmail },
        { status: 429 },
      )
    }
  } catch {
    // DAILY_SALT_BASE missing — degrade open rather than 500.
  }

  if (hasEmail) void saveSubscriber(email, 'unlock')

  // 3. Run the audit and cache it.
  try {
    const result = await runAudit(normalized)
    await saveAudit(normalized, result)
    return NextResponse.json({ result, cached: false })
  } catch (err) {
    console.error('[geo] audit failed:', (err as Error).message)
    return NextResponse.json({ error: 'The audit failed. Please try again.' }, { status: 500 })
  }
}

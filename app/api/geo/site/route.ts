/**
 * POST /api/geo/site
 *
 * Body: { domain: string }
 *
 * Discovers the domain's sitemap, creates a geo_site_audits row, and runs
 * the per-URL audits inline (single invocation, bounded concurrency).
 * Returns the row id; the client polls /api/geo/site/[id] for progress.
 *
 * NOTE: synchronous from the request's perspective — Vercel allows 300s
 * via maxDuration, which fits ~30 URLs at concurrency 3 (~90-150s typical).
 */
import { NextRequest, NextResponse } from 'next/server'
import { startSiteAudit, runSiteAuditBody } from '@/lib/geo/site-audit'
import { discoverSitemap } from '@/lib/geo/sitemap'
import { checkUsage } from '@/lib/geo/usage'
import { saveSubscriber } from '@/lib/geo/subscribers'
import { getClientIp, ipHash } from '@/lib/ip-hash'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SITE_DAILY_LIMIT_ANON = 1
const SITE_DAILY_LIMIT_EMAIL = 3
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeDomain(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  try {
    const u = new URL(s)
    return u.origin
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: { domain?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const domain = normalizeDomain(body.domain || '')
  if (!domain) return NextResponse.json({ error: 'Please enter a valid domain' }, { status: 400 })

  const email = (body.email || '').trim().toLowerCase()
  const hasEmail = EMAIL_RE.test(email)

  try {
    const key = hasEmail ? `site-e:${ipHash(email)}` : `site-ip:${ipHash(getClientIp(req))}`
    const limit = hasEmail ? SITE_DAILY_LIMIT_EMAIL : SITE_DAILY_LIMIT_ANON
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

  if (hasEmail) void saveSubscriber(email, 'geo-site')

  // discoverSitemap is called twice here (once to validate, once inside start);
  // both are fast and cache-friendly for the same domain.
  const discovery = await discoverSitemap(domain)
  if (!discovery) {
    return NextResponse.json({
      error: 'No sitemap.xml found at this domain. Site audits require a publicly accessible /sitemap.xml.',
    }, { status: 422 })
  }

  const started = await startSiteAudit(domain)
  if ('error' in started) {
    return NextResponse.json({ error: started.error }, { status: 500 })
  }

  // Run the body inline — completes within maxDuration for ~30 URLs.
  // Client polls /api/geo/site/[id] for incremental progress writes.
  try {
    await runSiteAuditBody(started.id, discovery.urls)
  } catch (err) {
    console.error('[geo-site] body failed:', (err as Error).message)
    return NextResponse.json({ id: started.id, error: 'Audit started but encountered errors' })
  }

  return NextResponse.json({ id: started.id })
}

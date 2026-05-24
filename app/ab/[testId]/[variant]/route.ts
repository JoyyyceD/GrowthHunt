/**
 * GET /ab/[testId]/[variant]
 *
 * Public tracked redirect: records a click for the given variant and 302s
 * to the test's target_url. This is the URL the user shares — short,
 * meaningful, no auth required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { recordAbClick } from '@/lib/agents/ab'
import { getClientIp, ipHash } from '@/lib/ip-hash'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ testId: string; variant: string }> }) {
  const { testId, variant } = await params
  if (!testId || !variant) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  let hashed: string | undefined
  try { hashed = ipHash(getClientIp(req)) } catch { /* salt missing → skip ip hash */ }

  const out = await recordAbClick(testId, variant, {
    ipHash: hashed,
    userAgent: req.headers.get('user-agent') || undefined,
    referrer: req.headers.get('referer') || undefined,
  })
  if (out.error || !out.target) {
    return NextResponse.json({ error: out.error || 'redirect failed' }, { status: 404 })
  }
  return NextResponse.redirect(out.target, { status: 302 })
}

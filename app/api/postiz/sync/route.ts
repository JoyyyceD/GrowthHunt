/**
 * Cron: reconcile the local scheduled-post mirror with reality.
 *
 * Postiz's public API doesn't expose a stable per-post status endpoint, so for
 * now this optimistically transitions due 'scheduled' rows to 'posted' a minute
 * after their scheduled time. Hard send-confirmation (and analytics) is the
 * Day-4 item once the list/analytics endpoints are validated against a live
 * instance — at which point this cron will instead read true status.
 *
 * Auth: Bearer <CRON_SECRET> (matches the other GrowthHunt crons).
 */
import { NextRequest, NextResponse } from 'next/server'
import { markDueAsPosted } from '@/lib/postiz/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const transitioned = await markDueAsPosted()
  return NextResponse.json({ ok: true, transitioned })
}

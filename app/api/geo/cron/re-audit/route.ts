/**
 * Cron: weekly re-audit of tracked URLs.
 * Schedule: Mondays at 10:00 UTC (configured in vercel.json).
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` if you set
 *       CRON_SECRET in env vars. We verify that here.
 *
 * Strategy:
 *   1. Pull up to MAX_PER_RUN due rows from geo_tracked_urls
 *   2. For each: runAudit, save snapshot, diff vs prior, email alert if
 *      score moved by >= ALERT_THRESHOLD (or first-ever snapshot)
 *   3. Bump next_run_at +7d, write back last_score / last_run_at
 *
 * Soft-fails per-row so one bad URL doesn't poison the batch.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runAudit } from '@/lib/audit'
import { listDue, markRun } from '@/lib/geo/tracked'
import { saveSnapshot, getPreviousSnapshot, computeDiff } from '@/lib/geo/snapshots'
import { sendWeeklyAlert } from '@/lib/geo/alert-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_PER_RUN = 25
const ALERT_THRESHOLD = 3   // absolute |delta| points; below this stays silent
const GAP_MS = 1500         // be polite between fetches

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true   // dev / unset → permit
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const due = await listDue(new Date(), MAX_PER_RUN)
  const summary = { picked: due.length, audited: 0, alerted: 0, errors: 0 as number }

  for (let i = 0; i < due.length; i++) {
    const row = due[i]!
    try {
      const result = await runAudit(row.url)
      if (result.status === 'error') {
        summary.errors += 1
        continue
      }
      const snap = await saveSnapshot(row.url_hash, result)
      const prev = snap ? await getPreviousSnapshot(row.url_hash, snap.id) : null
      const diff = prev && snap ? computeDiff(prev, snap) : null

      const shouldEmail = !prev || (diff !== null && Math.abs(diff.overallDelta) >= ALERT_THRESHOLD)
      if (shouldEmail) {
        try {
          await sendWeeklyAlert({ to: row.email, url: row.url, result, diff })
          summary.alerted += 1
        } catch (err) {
          console.error('[geo-cron] email failed:', (err as Error).message)
        }
      }
      await markRun(row.id, result.overall_score)
      summary.audited += 1
    } catch (err) {
      summary.errors += 1
      console.error(`[geo-cron] failed for ${row.url}:`, (err as Error).message)
    }
    if (i < due.length - 1) await new Promise((r) => setTimeout(r, GAP_MS))
  }

  return NextResponse.json(summary)
}

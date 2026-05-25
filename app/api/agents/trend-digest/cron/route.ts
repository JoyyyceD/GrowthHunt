/**
 * Cron: daily trend digest per workspace.
 * Schedule: every day at 08:00 UTC (configured in vercel.json).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runTrendDigest } from '@/lib/agents/trend-digest'
import type { Workspace } from '@/lib/workspace/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data } = await admin.from('gtm_workspaces').select('*').limit(20)
  const summary = { workspaces: 0, total_inserted: 0, errors: 0 }
  for (const ws of (data || []) as Workspace[]) {
    summary.workspaces += 1
    try {
      const r = await runTrendDigest(ws)
      summary.total_inserted += r.inserted
    } catch (err) {
      summary.errors += 1
      console.error('[trend-cron] failed:', ws.id, (err as Error).message)
    }
  }
  return NextResponse.json(summary)
}

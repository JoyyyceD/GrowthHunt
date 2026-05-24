/**
 * Cron: weekly competitor-watch scan across all workspaces.
 * Schedule: Tuesdays 09:00 UTC (configured in vercel.json).
 *
 * Pulls workspaces with at least one competitor URL configured, runs the
 * watch agent per workspace in series (to keep LLM rate under control).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCompetitorWatch } from '@/lib/agents/competitor'
import type { Workspace } from '@/lib/workspace/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_WORKSPACES_PER_RUN = 30

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('gtm_workspaces')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(MAX_WORKSPACES_PER_RUN)

  const summary = { workspaces: 0, snapshots: 0, diffs: 0, errors: 0 }
  for (const row of (data || []) as Workspace[]) {
    if (!Array.isArray(row.competitors) || row.competitors.length === 0) continue
    summary.workspaces += 1
    try {
      const out = await runCompetitorWatch({ workspace: row, diff: true })
      summary.snapshots += out.snapshots
      summary.diffs += out.diffs
      summary.errors += out.errors
    } catch (err) {
      console.error('[competitor-cron] workspace failed:', (err as Error).message)
      summary.errors += 1
    }
  }
  return NextResponse.json(summary)
}

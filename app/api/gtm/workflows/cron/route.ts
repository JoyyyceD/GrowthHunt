/**
 * Cron entry for scheduled workflows.
 * Schedule: 08:30 UTC daily (fires daily_content_sprint per workspace).
 * Future: read workflow_triggers table; for v1 we hardcode daily sprint.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startWorkflow } from '@/lib/workflows/runner'
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
  const summary = { started: 0, paused: 0, errors: 0 }
  for (const ws of (data || []) as Workspace[]) {
    try {
      const r = await startWorkflow('daily_content_sprint', ws, { triggeredBy: 'cron' })
      if ('error' in r) summary.errors += 1
      else if (r.status === 'awaiting_input') summary.paused += 1
      else summary.started += 1
    } catch { summary.errors += 1 }
  }
  return NextResponse.json(summary)
}

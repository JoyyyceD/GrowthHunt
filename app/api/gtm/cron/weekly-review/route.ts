/**
 * Cron: weekly review playbook per workspace.
 * Schedule: Sundays 14:00 UTC (configured in vercel.json).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runPlaybook } from '@/lib/playbooks/runner'
import type { Workspace } from '@/lib/workspace/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_WORKSPACES_PER_RUN = 20

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

  const summary = { workspaces: 0, succeeded: 0, failed: 0 }
  for (const ws of (data || []) as Workspace[]) {
    summary.workspaces += 1
    const result = await runPlaybook('weekly_review', ws, { triggeredBy: 'cron' })
    if ('error' in result) summary.failed += 1
    else summary.succeeded += 1
  }
  return NextResponse.json(summary)
}

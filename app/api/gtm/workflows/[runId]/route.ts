/**
 * GET /api/gtm/workflows/[runId] — workflow run detail
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkflowRun } from '@/lib/workflows/runner'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const run = await getWorkflowRun(runId)
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const admin = createAdminClient()
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id').eq('id', run.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json({ run })
}

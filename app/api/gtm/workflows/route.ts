/**
 * GET  /api/gtm/workflows                  → list available workflows + recent runs
 * POST /api/gtm/workflows                   → start a workflow run
 *   body: { workspace_id, workflow_id, inputs? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { listWorkflows } from '@/lib/workflows/registry'
import { startWorkflow, listWorkflowRuns } from '@/lib/workflows/runner'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ workflows: listWorkflows(), runs: [] })
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const ws = await getWorkspace(workspaceId)
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const runs = await listWorkflowRuns(ws.id)
  return NextResponse.json({ workflows: listWorkflows(), runs })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { workspace_id?: string; workflow_id?: string; inputs?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id || !body.workflow_id) return NextResponse.json({ error: 'workspace_id + workflow_id required' }, { status: 400 })
  const ws = await getWorkspace(body.workspace_id)
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const out = await startWorkflow(body.workflow_id, ws, { triggeredBy: 'manual_page', inputs: body.inputs ?? {} })
  return NextResponse.json(out)
}

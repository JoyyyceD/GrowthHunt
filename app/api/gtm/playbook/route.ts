/**
 * POST /api/gtm/playbook
 * Body: { workspace_id, playbook_id, params? }
 *
 * Manually start a playbook. Synchronous v1 — request returns when playbook
 * finishes (or fails). For long playbooks, the UI should poll
 * /api/gtm/tasks/[id] for progress.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runPlaybook } from '@/lib/playbooks/runner'
import { listPlaybooks } from '@/lib/playbooks/registry'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  // Convenience: list available playbooks.
  return NextResponse.json({ playbooks: listPlaybooks() })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { workspace_id?: string; playbook_id?: string; params?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  if (!body.playbook_id) return NextResponse.json({ error: 'playbook_id required' }, { status: 400 })

  const ws = await getWorkspace(body.workspace_id)
  if (!ws) return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const result = await runPlaybook(body.playbook_id, ws, { triggeredBy: 'manual_page', params: body.params })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({
    playbook_id: result.playbook.id,
    parent_task_id: result.parentTaskId,
    summary: result.summary,
    steps: result.steps,
  })
}

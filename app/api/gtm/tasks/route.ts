/**
 * GET /api/gtm/tasks?workspace_id=...&kinds=icp,voice
 *   Recent tasks for the workspace, optionally filtered by kind.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { listRecentTasks } from '@/lib/orchestrator/tasks'
import type { TaskKind } from '@/lib/orchestrator/types'

export const dynamic = 'force-dynamic'

const KINDS: TaskKind[] = ['icp','voice','landing','creator_outreach','cold_email','distribution','radar','ab','competitor','geo_audit','playbook','chat_turn']

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const ws = await getWorkspace(workspaceId)
  if (!ws) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const kindsParam = req.nextUrl.searchParams.get('kinds')
  const kinds = kindsParam
    ? (kindsParam.split(',').map((k) => k.trim()).filter((k): k is TaskKind => (KINDS as string[]).includes(k)))
    : undefined
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 20)))

  const tasks = await listRecentTasks({ workspaceId: ws.id, kinds, limit })
  return NextResponse.json({ tasks })
}

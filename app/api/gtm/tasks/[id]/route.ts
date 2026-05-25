/**
 * GET /api/gtm/tasks/[id] — task detail + child tasks (for playbooks).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getTask, getChildTasks } from '@/lib/orchestrator/tasks'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const task = await getTask(id)
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (task.workspace_id) {
    const ws = await getWorkspace(task.workspace_id)
    if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const children = await getChildTasks(id)
  return NextResponse.json({ task, children })
}

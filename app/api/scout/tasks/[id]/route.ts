/** GET /api/scout/tasks/[id]?ws=<workspaceId> — task state for reconnect replay. */
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const workspaceId = req.nextUrl.searchParams.get('ws')
  const auth = await requireWorkspace(workspaceId)
  if (auth instanceof Response) return auth

  const admin = createAdminClient()
  const { data } = await admin
    .from('scout_tasks')
    .select('id, kind, status, progress, error, created_at, updated_at')
    .eq('id', id)
    .eq('workspace_id', auth.workspace.id)
    .maybeSingle()
  if (!data) return Response.json({ error: 'task not found' }, { status: 404 })
  return Response.json({ task: data })
}

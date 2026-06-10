/** GET /api/scout/tasks?ws=<workspaceId> — latest onboarding task + workspace name (bootstrap). */
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  const admin = createAdminClient()
  const { data } = await admin
    .from('scout_tasks')
    .select('id, kind, status, progress, error, created_at, updated_at')
    .eq('workspace_id', auth.workspace.id)
    .eq('kind', 'onboarding')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return Response.json({ task: data || null, workspaceName: auth.workspace.name })
}

/**
 * POST /api/scout/onboard { url, brief?, workspaceId? }
 *
 * Fire-and-poll: returns { workspaceId, taskId } immediately; the pipeline
 * runs detached via after(callback) — fully outside the request scope, so a
 * client refresh/disconnect cannot abort it (decision 7.8, learned the hard
 * way). The workspace page renders progress by polling scout_tasks.
 */
import { NextRequest, after } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createWorkspace, getWorkspace, listWorkspacesForOwner } from '@/lib/workspace/store'
import { createOnboardingTask, runOnboardingPipeline } from '@/lib/scout/onboarding'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const WS_LIMIT = Number(process.env.SCOUT_WS_LIMIT || '1')

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { url?: string; brief?: string; workspaceId?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 })
  }
  const url = body.url?.trim()
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  let workspaceId = body.workspaceId
  if (workspaceId) {
    const ws = await getWorkspace(workspaceId)
    if (!ws || ws.owner_id !== user.id) return Response.json({ error: 'workspace not found' }, { status: 404 })
  } else {
    const existing = await listWorkspacesForOwner(user.id)
    if (existing.length >= WS_LIMIT) {
      return Response.json(
        { error: `Workspace limit reached (${WS_LIMIT}). Re-run onboarding inside an existing workspace instead.` },
        { status: 403 },
      )
    }
    const ws = await createWorkspace(user.id, { url })
    workspaceId = ws.id
  }

  const taskId = await createOnboardingTask(workspaceId)
  after(async () => {
    try {
      await runOnboardingPipeline({ workspaceId: workspaceId!, url, brief: body.brief, taskId })
    } catch (e) {
      console.error('[scout] onboarding pipeline crashed:', (e as Error).message)
    }
  })
  return Response.json({ workspaceId, taskId })
}

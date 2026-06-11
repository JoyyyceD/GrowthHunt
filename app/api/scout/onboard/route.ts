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
import { createAdminClient } from '@/lib/supabase/admin'
import { createWorkspace, getWorkspace, listWorkspacesForOwner } from '@/lib/workspace/store'
import { createOnboardingTask, runOnboardingPipeline } from '@/lib/scout/onboarding'
import { assertBudget, ScoutBudgetError } from '@/lib/scout/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const WS_LIMIT = Number(process.env.SCOUT_WS_LIMIT || '1')

/** "cal.com" → "Cal" — a presentable default until onboarding learns the real name. */
function nameFromUrl(url: string): string {
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
    const root = host.split('.')[0] || host
    return root.charAt(0).toUpperCase() + root.slice(1)
  } catch {
    return 'Workspace'
  }
}
const DAILY_ONBOARDING_LIMIT = Number(process.env.SCOUT_DAILY_ONBOARDING_LIMIT || '3')

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { url?: string; brief?: string; workspaceId?: string; invite?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 })
  }
  const url = body.url?.trim()
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  // Beta gate (V2-T0c): when invite codes are configured, new users need one;
  // anyone who already owns a workspace stays in.
  const inviteCodes = (process.env.SCOUT_INVITE_CODES || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  if (inviteCodes.length) {
    const hasWorkspace = (await listWorkspacesForOwner(user.id)).length > 0
    const inviteOk = body.invite ? inviteCodes.includes(body.invite.trim().toLowerCase()) : false
    if (!hasWorkspace && !inviteOk) {
      return Response.json({ needsInvite: true, error: 'invite code required' }, { status: 403 })
    }
  }

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
    const ws = await createWorkspace(user.id, { url, name: nameFromUrl(url) })
    workspaceId = ws.id
  }

  // Cost gates (bugfix #3): onboarding burns real tokens — honor the daily
  // budget and cap re-runs per workspace per day.
  try {
    await assertBudget(workspaceId)
  } catch (e) {
    if (e instanceof ScoutBudgetError) {
      return Response.json(
        { error: "Scout hit today's working budget for this workspace — try again tomorrow." },
        { status: 429 },
      )
    }
    throw e
  }
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const { count } = await createAdminClient()
    .from('scout_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('kind', 'onboarding')
    .gte('created_at', since.toISOString())
  if ((count ?? 0) >= DAILY_ONBOARDING_LIMIT) {
    return Response.json(
      { error: `Onboarding limit reached (${DAILY_ONBOARDING_LIMIT}/day per workspace). Ask Scout to revise specific documents instead — that's cheaper and faster.` },
      { status: 429 },
    )
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

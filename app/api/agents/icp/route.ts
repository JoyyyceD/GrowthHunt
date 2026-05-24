/**
 * POST /api/agents/icp
 * Body: { workspace_id: string, brief?: string, apply?: boolean }
 *
 * Runs the ICP/Positioning agent for a workspace. If apply=true (default),
 * the result is also patched into the workspace; otherwise it's returned
 * as a preview so the user can review before saving.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace, patchWorkspace } from '@/lib/workspace/store'
import { runIcpAgent } from '@/lib/agents/icp'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { workspace_id?: string; brief?: string; apply?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const ws = await getWorkspace(body.workspace_id)
  if (!ws) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const result = await runIcpAgent({ workspace: ws, brief: body.brief?.trim() || undefined })

  let updated = null
  if (body.apply !== false) {
    updated = await patchWorkspace(ws.id, {
      icp_summary: result.icp_summary || ws.icp_summary,
      icp_segments: result.icp_segments.length ? result.icp_segments : ws.icp_segments,
      positioning: result.positioning || ws.positioning,
      key_messages: result.key_messages.length ? result.key_messages : ws.key_messages,
      competitors: result.competitors.length ? result.competitors : ws.competitors,
    })
  }

  return NextResponse.json({ result, workspace: updated || ws })
}

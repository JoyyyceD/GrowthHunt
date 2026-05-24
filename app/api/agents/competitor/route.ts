/**
 * /api/agents/competitor
 *   POST → run a watch scan now (snapshot + diff)
 *   GET  → list latest snapshots + diffs for a workspace
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runCompetitorWatch, listSnapshots, listDiffs } from '@/lib/agents/competitor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function gate(workspaceId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const ws = await getWorkspace(workspaceId)
  if (!ws) return { error: NextResponse.json({ error: 'not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws }
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; diff?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error
  const out = await runCompetitorWatch({ workspace: g.ws, diff: body.diff !== false })
  return NextResponse.json(out)
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const [snapshots, diffs] = await Promise.all([listSnapshots(workspaceId), listDiffs(workspaceId)])
  return NextResponse.json({ snapshots, diffs })
}

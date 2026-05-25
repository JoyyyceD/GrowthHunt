/**
 * /api/agents/trend-digest
 *   POST → run a fresh digest pass; persists trend_candidates
 *   GET  → list current candidates for workspace
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runTrendDigest, listTrendCandidates } from '@/lib/agents/trend-digest'
import { recordTask } from '@/lib/orchestrator/tasks'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

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
  let body: { workspace_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error

  const { result } = await recordTask({
    kind: 'chat_turn',
    workspace_id: g.ws.id,
    triggered_by: 'manual_page',
    input: {},
    summary: 'Building today\'s trend digest…',
    summaryFromResult: (r: { inserted: number; scanned: number }) => `${r.inserted} drafts (scanned ${r.scanned})`,
  }, () => runTrendDigest(g.ws))
  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const candidates = await listTrendCandidates(g.ws.id)
  return NextResponse.json({ candidates })
}

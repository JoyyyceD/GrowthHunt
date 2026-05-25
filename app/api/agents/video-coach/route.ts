/**
 * /api/agents/video-coach
 *   POST → generate a new script
 *   GET  → list scripts for workspace
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runVideoCoach, listVideoScripts, SCENARIO_LABEL, type VideoScenario } from '@/lib/agents/video-coach'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

const SCENARIOS = Object.keys(SCENARIO_LABEL) as VideoScenario[]

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
  let body: { workspace_id?: string; scenario?: string; duration_sec?: number; topic?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  if (!body.scenario || !SCENARIOS.includes(body.scenario as VideoScenario)) return NextResponse.json({ error: `scenario must be one of ${SCENARIOS.join(', ')}` }, { status: 400 })
  if (!body.topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 })
  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error
  const script = await runVideoCoach({
    workspace: g.ws,
    scenario: body.scenario as VideoScenario,
    durationSec: body.duration_sec || 60,
    topic: body.topic,
  })
  return NextResponse.json({ script })
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const scripts = await listVideoScripts(g.ws.id)
  return NextResponse.json({ scripts })
}

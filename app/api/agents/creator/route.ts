/**
 * /api/agents/creator
 *
 *   POST → run the Creator Outreach agent; returns + persists drafts.
 *   GET  → list current drafts for the workspace.
 *
 * Body (POST): { workspace_id, picks?, notes? }
 * Query (GET): ?workspace_id=...
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runCreatorOutreach, listDrafts } from '@/lib/agents/creator'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function gateWorkspace(workspaceId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const ws = await getWorkspace(workspaceId)
  if (!ws) return { error: NextResponse.json({ error: 'not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws }
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; picks?: number; notes?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const gate = await gateWorkspace(body.workspace_id)
  if ('error' in gate) return gate.error

  const out = await runCreatorOutreach({
    workspace: gate.ws,
    picks: body.picks,
    notes: body.notes?.trim() || undefined,
  })
  return NextResponse.json(out)
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const gate = await gateWorkspace(workspaceId)
  if ('error' in gate) return gate.error

  const drafts = await listDrafts(workspaceId)
  return NextResponse.json({ drafts })
}

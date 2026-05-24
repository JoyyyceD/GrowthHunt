/**
 * /api/agents/cold-email
 *   POST → draft cold emails for the provided target list
 *   GET  → list existing email drafts for a workspace
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runColdEmailAgent, listEmailDrafts, parseTargetCsv, MAX_TARGETS_PER_RUN } from '@/lib/agents/cold-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
  let body: { workspace_id?: string; targets_csv?: string; campaign_note?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  if (!body.targets_csv?.trim()) return NextResponse.json({ error: 'targets_csv required' }, { status: 400 })

  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error

  const targets = parseTargetCsv(body.targets_csv)
  if (targets.length === 0) {
    return NextResponse.json({ error: `No valid emails parsed. Format: name, email, company, role, note (one per line, up to ${MAX_TARGETS_PER_RUN}).` }, { status: 400 })
  }

  const out = await runColdEmailAgent({
    workspace: g.ws,
    targets,
    campaignNote: body.campaign_note?.trim() || undefined,
  })
  return NextResponse.json(out)
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const drafts = await listEmailDrafts(workspaceId)
  return NextResponse.json({ drafts })
}

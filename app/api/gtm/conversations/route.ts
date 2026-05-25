/**
 * GET /api/gtm/conversations?workspace_id=...
 *   List conversations for the workspace.
 *
 * POST /api/gtm/conversations
 *   Body: { workspace_id, title? }
 *   Creates a new empty conversation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { listConversations, createConversation } from '@/lib/orchestrator/conversations'

export const dynamic = 'force-dynamic'

async function gate(req: NextRequest, workspaceId: string | null | undefined) {
  if (!workspaceId) return { error: NextResponse.json({ error: 'workspace_id required' }, { status: 400 }) }
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const ws = await getWorkspace(workspaceId)
  if (!ws) return { error: NextResponse.json({ error: 'not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws, user }
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  const g = await gate(req, workspaceId)
  if ('error' in g) return g.error
  const conversations = await listConversations(g.ws.id)
  return NextResponse.json({ conversations })
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; title?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const g = await gate(req, body.workspace_id)
  if ('error' in g) return g.error
  const conv = await createConversation(g.ws.id, body.title || 'New chat')
  if (!conv) return NextResponse.json({ error: 'Could not create' }, { status: 500 })
  return NextResponse.json({ conversation: conv })
}

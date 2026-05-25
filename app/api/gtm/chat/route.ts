/**
 * POST /api/gtm/chat
 *   Body: { workspace_id, conversation_id?, message }
 *   Returns: { conversation_id, assistant, route_to?, followups?, task_id? }
 *
 *   If conversation_id is omitted, creates a fresh conversation for the
 *   workspace and returns its id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { createConversation, getConversation } from '@/lib/orchestrator/conversations'
import { runChatTurn } from '@/lib/orchestrator/chat'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { workspace_id?: string; conversation_id?: string; message?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  if (!body.message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const ws = await getWorkspace(body.workspace_id)
  if (!ws) return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let conversationId = body.conversation_id
  if (conversationId) {
    const conv = await getConversation(conversationId)
    if (!conv || conv.workspace_id !== ws.id) {
      return NextResponse.json({ error: 'conversation not found' }, { status: 404 })
    }
  } else {
    const conv = await createConversation(ws.id)
    if (!conv) return NextResponse.json({ error: 'could not create conversation' }, { status: 500 })
    conversationId = conv.id
  }

  try {
    const out = await runChatTurn({
      workspace: ws,
      userId: user.id,
      conversationId,
      message: body.message.trim(),
    })
    return NextResponse.json({
      conversation_id: conversationId,
      assistant: out.assistant,
      route_to: out.routeTo,
      followups: out.followups,
      task_id: out.taskId,
      tool_used: out.toolUsed,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

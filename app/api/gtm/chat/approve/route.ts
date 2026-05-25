/**
 * POST /api/gtm/chat/approve
 * Body: { workspace_id, conversation_id, tool, params, approved }
 *
 * Resumes a paused chat turn after the user approves (or denies) a sensitive
 * tool call surfaced by the ReAct loop's approval gate.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getConversation } from '@/lib/orchestrator/conversations'
import { approveChatTurn } from '@/lib/orchestrator/chat'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { workspace_id?: string; conversation_id?: string; tool?: string; params?: Record<string, unknown>; approved?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id || !body.conversation_id || !body.tool) return NextResponse.json({ error: 'workspace_id, conversation_id, tool required' }, { status: 400 })
  const ws = await getWorkspace(body.workspace_id)
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const conv = await getConversation(body.conversation_id)
  if (!conv || conv.workspace_id !== ws.id) return NextResponse.json({ error: 'conversation not found' }, { status: 404 })
  if (body.approved === false) {
    return NextResponse.json({ assistant: { content: `Denied — **${body.tool}** was not run.` }, tool_used: body.tool, steps: [] })
  }
  const out = await approveChatTurn({
    workspace: ws, userId: user.id, conversationId: body.conversation_id,
    tool: body.tool, params: body.params ?? {},
  })
  return NextResponse.json({
    conversation_id: body.conversation_id,
    assistant: out.assistant,
    route_to: out.routeTo,
    followups: out.followups,
    task_id: out.taskId,
    tool_used: out.toolUsed,
    steps: out.steps,
  })
}

/**
 * POST /api/gtm/chat/stream — Server-Sent Events variant of /api/gtm/chat.
 *
 * Emits the chat turn progressively so the UI can render a genspark-style
 * cascade: preamble bubble → live tool-step ticks → final synthesis.
 *
 * Events:
 *   - `preamble` { content, needs_tools, conversation_id, message_id }
 *   - `step`     { step_index, action_kind, tool_name, observation, ... }
 *   - `final`    { conversation_id, assistant, route_to?, followups?,
 *                  task_id?, tool_used, steps, approval_request? }
 *   - `error`    { error: string }
 *
 * Stream terminates after `final` (or `error`). Each event is a single SSE
 * frame: `event: <name>\ndata: <json>\n\n`.
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { createConversation, getConversation } from '@/lib/orchestrator/conversations'
import { runChatTurn } from '@/lib/orchestrator/chat'
import type { StepTrace } from '@/lib/orchestrator/loop'
import type { GtmMessage } from '@/lib/orchestrator/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  let body: { workspace_id?: string; conversation_id?: string; message?: string; page_context?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  if (!body.workspace_id) return new Response(JSON.stringify({ error: 'workspace_id required' }), { status: 400 })
  if (!body.message?.trim()) return new Response(JSON.stringify({ error: 'message required' }), { status: 400 })

  const ws = await getWorkspace(body.workspace_id)
  if (!ws) return new Response(JSON.stringify({ error: 'workspace not found' }), { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })

  let conversationId = body.conversation_id
  if (conversationId) {
    const conv = await getConversation(conversationId)
    if (!conv || conv.workspace_id !== ws.id) {
      return new Response(JSON.stringify({ error: 'conversation not found' }), { status: 404 })
    }
  } else {
    const conv = await createConversation(ws.id)
    if (!conv) return new Response(JSON.stringify({ error: 'could not create conversation' }), { status: 500 })
    conversationId = conv.id
  }

  const message = body.message.trim()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(sseFrame(event, data))) } catch { /* connection closed */ }
      }
      // Best-effort flush heartbeat to defeat proxy buffering.
      send('ping', { conversation_id: conversationId, at: Date.now() })
      try {
        const out = await runChatTurn(
          { workspace: ws, userId: user.id, conversationId: conversationId!, message, pageContext: body.page_context?.trim() || undefined },
          {
            onPreamble: (msg: GtmMessage, needsTools: boolean) => {
              send('preamble', {
                conversation_id: conversationId,
                message_id: msg.id,
                content: msg.content,
                needs_tools: needsTools,
                created_at: msg.created_at,
              })
            },
            onStep: (step: StepTrace) => {
              send('step', step)
            },
          },
        )
        send('final', {
          conversation_id: conversationId,
          assistant: out.assistant,
          preamble: out.preamble ?? null,
          route_to: out.routeTo,
          followups: out.followups,
          task_id: out.taskId,
          tool_used: out.toolUsed,
          steps: out.steps,
          approval_request: out.approvalRequest,
        })
      } catch (err) {
        send('error', { error: (err as Error).message })
      } finally {
        try { controller.close() } catch { /* noop */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

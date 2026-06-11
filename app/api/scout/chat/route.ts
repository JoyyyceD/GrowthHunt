/**
 * POST /api/scout/chat { workspaceId, conversationId?, message }
 * One Scout turn, streamed as SSE ScoutEvents. Messages persist to the
 * existing gtm_conversations / gtm_messages tables (imported as a library).
 */
import { NextRequest } from 'next/server'
import {
  createConversation,
  getConversation,
  listMessages,
  appendMessage,
  maybeAutoTitle,
} from '@/lib/orchestrator/conversations'
import { runScoutTurn } from '@/lib/scout/loop'
import { requireWorkspace, sseResponse } from '@/lib/scout/auth'
import type { ChatMessage } from '@/lib/scout/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const HISTORY_LIMIT = 30

export async function POST(req: NextRequest) {
  let body: { workspaceId?: string; conversationId?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 })
  }
  const auth = await requireWorkspace(body.workspaceId)
  if (auth instanceof Response) return auth
  const message = body.message?.trim()
  if (!message) return Response.json({ error: 'message required' }, { status: 400 })

  let conversationId = body.conversationId || null
  if (conversationId) {
    const conv = await getConversation(conversationId)
    if (!conv || conv.workspace_id !== auth.workspace.id) {
      return Response.json({ error: 'conversation not found' }, { status: 404 })
    }
  } else {
    const conv = await createConversation(auth.workspace.id)
    conversationId = conv?.id ?? null
  }

  const history: ChatMessage[] = conversationId
    ? (await listMessages(conversationId, HISTORY_LIMIT))
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    : []

  return sseResponse(async send => {
    send({ type: 'conversation', conversationId })
    if (conversationId) {
      await appendMessage({ conversation_id: conversationId, role: 'user', content: message })
      await maybeAutoTitle(conversationId, message.slice(0, 60))
    }
    let lastQuestion = ''
    const result = await runScoutTurn({
      workspaceId: auth.workspace.id,
      conversationId,
      userMessage: message,
      history,
      emit: event => {
        if (event.type === 'ask_user') {
          lastQuestion = event.options?.length
            ? `${event.question}\nOptions: ${event.options.join(' / ')}`
            : event.question
        }
        send(event)
      },
    })
    // Persist the turn's outcome — for ask_user turns that's the question
    // itself, so the next turn's history explains what "option 1" refers to.
    const toPersist = result.reply || (result.endedWith === 'ask_user' ? lastQuestion : '')
    if (conversationId && toPersist) {
      await appendMessage({ conversation_id: conversationId, role: 'assistant', content: toPersist })
    }
  })
}

/**
 * Chat orchestrator turn — ReAct loop edition.
 *
 *   1. Append user message to gtm_messages.
 *   2. Wrap the whole turn in a `chat_turn` gtm_task.
 *   3. Run lib/orchestrator/loop.runReactLoop — up to 5 steps, each persisted
 *      to agent_steps for UI trace.
 *   4. Append assistant message (final_answer) with last tool_call payload.
 *   5. Return { assistant, steps, routeTo, followups, approvalRequest? }.
 *
 * No streaming — MiniMax is single-shot per step. UI shows a "thinking" bubble
 * during the loop; final response renders the trace as collapsible thoughts.
 */
import type { Workspace } from '@/lib/workspace/types'
import { appendMessage, listMessages, maybeAutoTitle } from './conversations'
import { recordTask } from './tasks'
import { runReactLoop, resumeAfterApproval, type StepTrace, type LoopOutput } from './loop'
import { TOOLS } from './tools'
import type { GtmMessage } from './types'

export interface ChatTurnInput {
  workspace: Workspace
  userId: string
  conversationId: string
  message: string
}

export interface ChatTurnOutput {
  assistant: GtmMessage
  toolUsed: string
  routeTo?: string
  followups?: string[]
  taskId?: string
  steps: StepTrace[]
  approvalRequest?: LoopOutput['approvalRequest']
}

export async function runChatTurn(input: ChatTurnInput): Promise<ChatTurnOutput> {
  const { workspace, userId, conversationId, message } = input

  // 1. persist user turn + maybe-rename conversation
  const userMsg = await appendMessage({ conversation_id: conversationId, role: 'user', content: message })
  void maybeAutoTitle(conversationId, message)

  // 2. load history (exclude the message we just inserted)
  const history = await listMessages(conversationId, 20)
  const historyForLoop = history.filter((m) => m.id !== userMsg?.id)

  // 3. wrap in a chat_turn task so /gtm/tasks history is complete
  const { task, result } = await recordTask({
    kind: 'chat_turn',
    workspace_id: workspace.id,
    conversation_id: conversationId,
    triggered_by: 'chat',
    input: { message },
    summary: message.slice(0, 100),
  }, async () => {
    return await runReactLoop({
      workspace, userId, conversationId,
      history: historyForLoop,
      message,
      turnTaskId: '', // patched below — recordTask gives us task.id after wrapper finishes
    })
  })

  // recordTask runs the fn before creating the row patch — so loop ran with empty turnTaskId.
  // We persist each step to agent_steps inside the loop; backfill turn_task_id now.
  if (task?.id) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      await admin
        .from('agent_steps')
        .update({ turn_task_id: task.id })
        .is('turn_task_id', null)
        .eq('conversation_id', conversationId)
    } catch { /* noop */ }
  }

  const loop = result

  // 4. persist the assistant turn
  const lastStep = loop.steps[loop.steps.length - 1]
  const tool_call = lastStep ? {
    name: loop.toolUsed,
    params: lastStep.tool_params,
    route_to: loop.routeTo,
  } : { name: loop.toolUsed }
  const assistant = await appendMessage({
    conversation_id: conversationId,
    role: 'assistant',
    content: loop.finalAnswer,
    tool_call,
    task_id: loop.taskId ?? task?.id ?? null,
  })

  return {
    assistant: assistant!,
    toolUsed: loop.toolUsed,
    routeTo: loop.routeTo,
    followups: loop.followups,
    taskId: loop.taskId,
    steps: loop.steps,
    approvalRequest: loop.approvalRequest,
  }
}

/** After UI approval, replay the gated tool call. */
export async function approveChatTurn(input: {
  workspace: Workspace; userId: string; conversationId: string;
  tool: string; params: Record<string, unknown>;
}): Promise<ChatTurnOutput> {
  const history = await listMessages(input.conversationId, 20)

  const { task, result: loop } = await recordTask({
    kind: 'chat_turn',
    workspace_id: input.workspace.id,
    conversation_id: input.conversationId,
    triggered_by: 'chat',
    input: { approved_tool: input.tool, params: input.params },
    summary: `Approved: ${input.tool}`,
  }, async () => resumeAfterApproval({
    workspace: input.workspace, userId: input.userId, conversationId: input.conversationId,
    history, message: `(approved ${input.tool})`, turnTaskId: '',
    approval: { tool: input.tool, params: input.params, approved: true },
  }))

  const lastStep = loop.steps[loop.steps.length - 1]
  const assistant = await appendMessage({
    conversation_id: input.conversationId,
    role: 'assistant',
    content: loop.finalAnswer,
    tool_call: { name: loop.toolUsed, params: lastStep?.tool_params, route_to: loop.routeTo },
    task_id: loop.taskId ?? task?.id ?? null,
  })

  return {
    assistant: assistant!,
    toolUsed: loop.toolUsed,
    routeTo: loop.routeTo,
    followups: loop.followups,
    taskId: loop.taskId,
    steps: loop.steps,
  }
}

/** For the UI: tool registry list for an "actions" panel. */
export function publicToolList(): Array<{ name: string; description: string; kind: string }> {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, kind: t.kind }))
}

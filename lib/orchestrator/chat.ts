/**
 * Chat orchestrator turn — ReAct loop edition.
 *
 *   1. If the message is a `/slash` command, dispatch the tool directly
 *      (skip classifier) with permission check, persist a synthetic step.
 *   2. Otherwise: append user msg → wrap turn in `chat_turn` gtm_task →
 *      compact history → runReactLoop (up to 5 steps, each persisted to
 *      agent_steps) → append assistant message.
 *   3. Return { assistant, steps, routeTo, followups, approvalRequest? }.
 *
 * No streaming — MiniMax is single-shot per step. UI shows a "thinking" bubble
 * during the loop; final response renders the trace as collapsible thoughts.
 */
import type { Workspace } from '@/lib/workspace/types'
import { appendMessage, listMessages, maybeAutoTitle } from './conversations'
import { createTask, finishTask, recordTask } from './tasks'
import { runReactLoop, resumeAfterApproval, type StepTrace, type LoopOutput } from './loop'
import { TOOLS, findTool, type ToolCtx } from './tools'
import { defaultCanUseTool } from './permissions'
import { compactHistory } from './compact'
import { parseSlashCommand } from './slash'
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

  // 1a. Slash command short-circuit.
  const slash = parseSlashCommand(message, workspace)
  if (slash) {
    return runSlashTurn(input, slash)
  }

  // 1b. Persist user turn + maybe-rename conversation.
  const userMsg = await appendMessage({ conversation_id: conversationId, role: 'user', content: message })
  void maybeAutoTitle(conversationId, message)

  // 2. Load + compact history (exclude the message we just inserted).
  const history = await listMessages(conversationId, 20)
  const historyForLoop = compactHistory(history.filter((m) => m.id !== userMsg?.id), { keepLast: 6, snippetLen: 100 })

  // 3. Wrap in a chat_turn task and run loop with task.id threaded in.
  const { task, result: loop } = await recordTask({
    kind: 'chat_turn',
    workspace_id: workspace.id,
    conversation_id: conversationId,
    triggered_by: 'chat',
    input: { message },
    summary: message.slice(0, 100),
  }, async (turnTask) => {
    return await runReactLoop({
      workspace, userId, conversationId,
      history: historyForLoop,
      message,
      turnTaskId: turnTask?.id ?? '',
    })
  })

  // The loop already persisted each step with turn_task_id = task.id (passed
  // in via runReactLoop). No backfill needed.

  // 4. Persist the assistant turn.
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

/**
 * Slash command path — bypass the ReAct classifier and run the resolved tool
 * directly. Still wraps in a chat_turn task and writes one synthetic step so
 * /gtm/tasks/[id]/trace renders sensibly.
 */
async function runSlashTurn(input: ChatTurnInput, slash: NonNullable<ReturnType<typeof parseSlashCommand>>): Promise<ChatTurnOutput> {
  const { workspace, userId, conversationId, message } = input

  await appendMessage({ conversation_id: conversationId, role: 'user', content: message })
  void maybeAutoTitle(conversationId, message)

  // Unresolved slash → reply with error inline, no task wrap.
  if ('error' in slash) {
    const assistant = await appendMessage({
      conversation_id: conversationId, role: 'assistant',
      content: `Couldn\'t run \`/${slash.name}\` — ${slash.error}`,
      tool_call: { name: 'slash_error' },
    })
    return { assistant: assistant!, toolUsed: 'slash_error', steps: [] }
  }

  const tool = findTool(slash.tool)
  if (!tool) {
    const assistant = await appendMessage({
      conversation_id: conversationId, role: 'assistant',
      content: `Slash command resolved to unknown tool \`${slash.tool}\`.`,
      tool_call: { name: 'slash_error' },
    })
    return { assistant: assistant!, toolUsed: 'slash_error', steps: [] }
  }

  // Wrap in a chat_turn task so this slash run shows up in /gtm/tasks history.
  const turnTask = await createTask({
    kind: 'chat_turn',
    workspace_id: workspace.id,
    conversation_id: conversationId,
    triggered_by: 'chat',
    input: { message, slash: { tool: slash.tool, params: slash.params } },
    summary: `/${message.trim().split(/\s+/)[0].replace(/^\//, '')}`,
  })

  const toolCtx: ToolCtx = { workspace, userId, conversationId, turnTaskId: turnTask?.id }
  const permission = defaultCanUseTool(tool, slash.params, toolCtx)

  // Permission deny → final answer, no execute.
  if (permission.decision === 'deny') {
    if (turnTask) await finishTask(turnTask.id, { status: 'failed', error: permission.reason })
    const assistant = await appendMessage({
      conversation_id: conversationId, role: 'assistant',
      content: `I can\'t run \`${slash.tool}\` — ${permission.reason}`,
      tool_call: { name: slash.tool },
      task_id: turnTask?.id ?? null,
    })
    return { assistant: assistant!, toolUsed: slash.tool, steps: [], taskId: turnTask?.id }
  }

  // Permission ask → surface as approval request, do NOT execute.
  if (permission.decision === 'ask') {
    if (turnTask) await finishTask(turnTask.id, { status: 'awaiting_user', summary: `awaiting approval: ${slash.tool}` })
    const step: StepTrace = {
      step_index: 0,
      thought: `Slash command /${slash.tool} needs approval`,
      action_kind: 'approval_request',
      tool_name: slash.tool,
      tool_params: slash.params,
      observation: permission.reason,
      duration_ms: 0,
    }
    const assistant = await appendMessage({
      conversation_id: conversationId, role: 'assistant',
      content: `Approval needed for **${slash.tool}** — ${permission.reason}`,
      tool_call: { name: slash.tool, params: slash.params },
      task_id: turnTask?.id ?? null,
    })
    return {
      assistant: assistant!, toolUsed: 'approval_request', steps: [step],
      approvalRequest: { tool: slash.tool, params: slash.params, reason: permission.reason },
      taskId: turnTask?.id,
    }
  }

  // Permission allow → run the tool.
  const start = Date.now()
  let toolResult
  try {
    toolResult = await tool.run(slash.params, toolCtx)
  } catch (err) {
    if (turnTask) await finishTask(turnTask.id, { status: 'failed', error: (err as Error).message, duration_ms: Date.now() - start })
    const assistant = await appendMessage({
      conversation_id: conversationId, role: 'assistant',
      content: `\`${slash.tool}\` threw: ${(err as Error).message}`,
      tool_call: { name: slash.tool },
      task_id: turnTask?.id ?? null,
    })
    return { assistant: assistant!, toolUsed: slash.tool, steps: [], taskId: turnTask?.id }
  }

  if (turnTask) {
    await finishTask(turnTask.id, {
      status: 'succeeded',
      output: { summary: toolResult.summary, routeTo: toolResult.routeTo, taskId: toolResult.taskId },
      summary: `slash ${slash.resolvedAs}`,
      duration_ms: Date.now() - start,
    })
  }

  const step: StepTrace = {
    step_index: 0,
    thought: `Slash → ${slash.resolvedAs}`,
    action_kind: 'tool_call',
    tool_name: slash.tool,
    tool_params: slash.params,
    observation: toolResult.summary.slice(0, 2000),
    task_id: toolResult.taskId,
    duration_ms: Date.now() - start,
  }
  // Persist the step row so /gtm/tasks/[id]/trace renders.
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    await admin.from('agent_steps').insert({
      workspace_id: workspace.id,
      conversation_id: conversationId,
      turn_task_id: turnTask?.id ?? null,
      step_index: 0,
      thought: step.thought,
      action_kind: step.action_kind,
      tool_name: step.tool_name,
      tool_params: step.tool_params,
      observation: step.observation,
      task_id: step.task_id,
      duration_ms: step.duration_ms,
    })
  } catch { /* noop */ }

  const assistant = await appendMessage({
    conversation_id: conversationId,
    role: 'assistant',
    content: toolResult.summary,
    tool_call: { name: slash.tool, params: slash.params, route_to: toolResult.routeTo },
    task_id: toolResult.taskId ?? turnTask?.id ?? null,
  })

  return {
    assistant: assistant!,
    toolUsed: slash.tool,
    routeTo: toolResult.routeTo,
    followups: toolResult.followups,
    taskId: toolResult.taskId ?? turnTask?.id,
    steps: [step],
  }
}

/** After UI approval, replay the gated tool call. */
export async function approveChatTurn(input: {
  workspace: Workspace; userId: string; conversationId: string;
  tool: string; params: Record<string, unknown>;
}): Promise<ChatTurnOutput> {
  const history = await listMessages(input.conversationId, 20)
  const compacted = compactHistory(history, { keepLast: 6 })

  const { task, result: loop } = await recordTask({
    kind: 'chat_turn',
    workspace_id: input.workspace.id,
    conversation_id: input.conversationId,
    triggered_by: 'chat',
    input: { approved_tool: input.tool, params: input.params },
    summary: `Approved: ${input.tool}`,
  }, async (turnTask) => resumeAfterApproval({
    workspace: input.workspace, userId: input.userId, conversationId: input.conversationId,
    history: compacted, message: `(approved ${input.tool})`, turnTaskId: turnTask?.id ?? '',
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

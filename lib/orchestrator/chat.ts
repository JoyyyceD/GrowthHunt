/**
 * Chat orchestrator turn — triage + ReAct + streaming hooks.
 *
 *   1. Slash command → direct dispatch (bypass triage + loop), one synthetic
 *      agent_steps row, done.
 *   2. Triage stage — fast MiniMax call returns:
 *        { reply: "<1-3 sentences>", needs_tools: boolean, tool_hint? }
 *      The reply is ALWAYS surfaced as the "preamble" assistant message.
 *   3. If !needs_tools: that preamble IS the final answer, no loop runs.
 *      Solves the "agent jumps to tools" UX problem — every message gets a
 *      conversational reply first.
 *   4. If needs_tools: persist preamble, then runReactLoop with tool_hint.
 *      Final synthesis becomes a second assistant message.
 *
 * Streaming: callers can pass {onPreamble, onStep} to receive events live;
 * the SSE route uses these to flush events as they happen.
 */
import type { Workspace } from '@/lib/workspace/types'
import { appendMessage, listMessages, maybeAutoTitle } from './conversations'
import { createTask, finishTask, recordTask } from './tasks'
import { runReactLoop, resumeAfterApproval, type StepTrace, type LoopOutput } from './loop'
import { TOOLS, findTool, type ToolCtx } from './tools'
import { defaultCanUseTool } from './permissions'
import { compactHistory } from './compact'
import { parseSlashCommand } from './slash'
import { triageMessage } from './triage'
import type { GtmMessage } from './types'

export interface ChatTurnInput {
  workspace: Workspace
  userId: string
  conversationId: string
  message: string
  /**
   * Optional snapshot of "what the user is looking at right now" — collected
   * on the frontend via useCopilotReadable hooks. Threaded into the triage
   * + loop prompts so the agent can reason about page context without the
   * user having to repeat themselves.
   */
  pageContext?: string
}

export interface ChatTurnEvents {
  /** Fired once with the immediate conversational reply, before any tool runs. */
  onPreamble?: (msg: GtmMessage, needsTools: boolean) => void
  /** Fired for each ReAct step as it lands in agent_steps. */
  onStep?: (step: StepTrace) => void
}

export interface ChatTurnOutput {
  /** Final synthesis assistant message (or the triage reply when chat-only). */
  assistant: GtmMessage
  /** When the triage produced a separate conversational preamble. */
  preamble?: GtmMessage
  toolUsed: string
  routeTo?: string
  followups?: string[]
  taskId?: string
  steps: StepTrace[]
  approvalRequest?: LoopOutput['approvalRequest']
}

export async function runChatTurn(input: ChatTurnInput, events: ChatTurnEvents = {}): Promise<ChatTurnOutput> {
  const { workspace, userId, conversationId, message, pageContext } = input

  // 1. Slash command short-circuit.
  const slash = parseSlashCommand(message, workspace)
  if (slash) {
    return runSlashTurn(input, slash, events)
  }

  // 2. Persist user turn + auto-title.
  const userMsg = await appendMessage({ conversation_id: conversationId, role: 'user', content: message })
  void maybeAutoTitle(conversationId, message)

  // 3. Load + compact history (exclude the message we just inserted).
  const history = await listMessages(conversationId, 20)
  const historyClean = history.filter((m) => m.id !== userMsg?.id)
  const historyForLoop = compactHistory(historyClean, { keepLast: 6, snippetLen: 100 })

  // 4. TRIAGE — always get a conversational reply first.
  const triage = await triageMessage(workspace, historyClean, message, pageContext)

  // 5. Persist the preamble (always — it's what the user reads first).
  const preamble = await appendMessage({
    conversation_id: conversationId,
    role: 'assistant',
    content: triage.reply,
    tool_call: { name: triage.needs_tools ? 'preamble' : 'chat' },
  })
  if (preamble) events.onPreamble?.(preamble, triage.needs_tools)

  // 6. Chat-only branch: triage reply IS the final answer, no loop, no task.
  if (!triage.needs_tools) {
    return {
      assistant: preamble!,
      preamble: undefined, // the assistant IS the preamble in this branch
      toolUsed: 'chat',
      steps: [],
    }
  }

  // 7. Tool branch — wrap in chat_turn task and run ReAct loop.
  const { task, result: loop } = await recordTask({
    kind: 'chat_turn',
    workspace_id: workspace.id,
    conversation_id: conversationId,
    triggered_by: 'chat',
    input: { message, triage_reply: triage.reply, tool_hint: triage.tool_hint, has_page_context: Boolean(pageContext) },
    summary: message.slice(0, 100),
  }, async (turnTask) => {
    return await runReactLoop({
      workspace, userId, conversationId,
      history: historyForLoop,
      message,
      turnTaskId: turnTask?.id ?? '',
      toolHint: triage.tool_hint,
      pageContext,
      onStep: events.onStep,
    })
  })

  // 8. Persist the final synthesis.
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
    preamble: preamble ?? undefined,
    toolUsed: loop.toolUsed,
    routeTo: loop.routeTo,
    followups: loop.followups,
    taskId: loop.taskId,
    steps: loop.steps,
    approvalRequest: loop.approvalRequest,
  }
}

/**
 * Slash command path — bypass triage + ReAct. Runs the resolved tool directly
 * with the same permission check + agent_steps trace.
 */
async function runSlashTurn(
  input: ChatTurnInput,
  slash: NonNullable<ReturnType<typeof parseSlashCommand>>,
  events: ChatTurnEvents,
): Promise<ChatTurnOutput> {
  const { workspace, userId, conversationId, message } = input

  await appendMessage({ conversation_id: conversationId, role: 'user', content: message })
  void maybeAutoTitle(conversationId, message)

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
    events.onStep?.(step)
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

  // Allow → execute.
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
  events.onStep?.(step)
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
}, events: ChatTurnEvents = {}): Promise<ChatTurnOutput> {
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
    onStep: events.onStep,
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

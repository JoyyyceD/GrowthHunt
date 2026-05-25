/**
 * Chat orchestrator turn.
 *
 *   1. Append user message to gtm_messages.
 *   2. Ask MiniMax to classify intent + pick a tool (JSON output).
 *   3. Dispatch tool through registry — execute / route / playbook / answer.
 *   4. Append assistant message with tool_call payload + tool summary.
 *   5. Return { assistant_message, route_to?, followups? } to the client.
 *
 * Single round-trip per turn (no streaming — MiniMax has no stream). The
 * UI shows an optimistic "running…" bubble until this resolves.
 */
import { workspaceContext, callAgent, extractJson, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'
import {
  TOOLS, findTool, toolsPromptCatalog, type ToolResult, type OrchestratorTool,
} from './tools'
import {
  appendMessage, listMessages, maybeAutoTitle,
} from './conversations'
import { recordTask } from './tasks'
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
}

interface ClassifierResponse {
  tool?: string
  params?: Record<string, unknown>
  thinking?: string
}

function buildClassifierPrompt(ws: Workspace, history: GtmMessage[], message: string): { system: string; user: string } {
  const recent = history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 400)}${m.tool_call?.name ? ` [tool: ${m.tool_call.name}]` : ''}`)
    .join('\n')

  const system = withVoice(
    'You are the GrowthHunt GTM orchestrator. You decide which tool to call '
    + 'for each user turn. Reply with ONLY a JSON object — no prose, no '
    + 'markdown fences. Pick the single most appropriate tool from the '
    + 'catalog. If unsure, use the "answer" tool with a helpful plain reply. '
    + 'Be terse. Prefer tools that actually do work over generic answers.',
    ws.voice,
  )

  const user = [
    `WORKSPACE CONTEXT:\n${workspaceContext(ws)}`,
    '',
    'TOOL CATALOG (param* = required):',
    toolsPromptCatalog(),
    '',
    `RECENT TURNS:\n${recent || '(empty)'}`,
    '',
    `NEW USER MESSAGE:\n${message}`,
    '',
    'Return JSON exactly:',
    '{',
    '  "thinking": "<1 sentence — why this tool>",',
    '  "tool": "<one of the tool names above>",',
    '  "params": { ... per the tool\'s param schema ... }',
    '}',
  ].join('\n')
  return { system, user }
}

async function classify(ws: Workspace, history: GtmMessage[], message: string): Promise<ClassifierResponse> {
  const { system, user } = buildClassifierPrompt(ws, history, message)
  const raw = await callAgent({ system, user, maxTokens: 600, temperature: 0.2 })
  if (!raw) {
    return { tool: 'answer', params: { reply: 'The orchestrator LLM is unreachable right now. Try again in a moment, or open any agent page directly.' } }
  }
  const parsed = extractJson<ClassifierResponse>(raw)
  if (!parsed || !parsed.tool) {
    return { tool: 'answer', params: { reply: "I couldn't pick a tool for that. Try rephrasing — e.g. 'audit my landing page' or 'find 5 creators to DM'." } }
  }
  return parsed
}

export async function runChatTurn(input: ChatTurnInput): Promise<ChatTurnOutput> {
  const { workspace, userId, conversationId, message } = input

  // 1. persist the user turn
  const userMsg = await appendMessage({ conversation_id: conversationId, role: 'user', content: message })
  void maybeAutoTitle(conversationId, message)

  // 2. load history for classifier (exclude the just-inserted message? no, include it for context-fidelity)
  const history = await listMessages(conversationId, 20)

  // 3. classify + dispatch
  const { task, result } = await recordTask({
    kind: 'chat_turn',
    workspace_id: workspace.id,
    conversation_id: conversationId,
    triggered_by: 'chat',
    input: { message },
    summary: message.slice(0, 100),
  }, async () => {
    const classification = await classify(workspace, history.filter((m) => m.id !== userMsg?.id), message)
    const tool = findTool(classification.tool || 'answer') || findTool('answer')!
    const toolResult = await dispatchTool(tool, classification.params || {}, {
      workspace, userId, conversationId,
    })
    return { tool: tool.name, toolResult, classification }
  })

  const toolResult: ToolResult = result.toolResult
  const toolUsed: string = result.tool

  // 4. persist assistant turn
  const assistant = await appendMessage({
    conversation_id: conversationId,
    role: 'assistant',
    content: toolResult.summary,
    tool_call: {
      name: toolUsed,
      params: result.classification?.params,
      route_to: toolResult.routeTo,
    },
    task_id: toolResult.taskId ?? task.id ?? null,
  })

  return {
    assistant: assistant!,
    toolUsed,
    routeTo: toolResult.routeTo,
    followups: toolResult.followups,
    taskId: toolResult.taskId,
  }
}

async function dispatchTool(tool: OrchestratorTool, params: Record<string, unknown>, ctx: { workspace: Workspace; userId: string; conversationId: string }): Promise<ToolResult> {
  try {
    return await tool.run(params, ctx)
  } catch (err) {
    console.error(`[chat] tool ${tool.name} threw:`, (err as Error).message)
    return { summary: `Tool **${tool.name}** failed: ${(err as Error).message}` }
  }
}

/** For the UI: returns the registered tool descriptions for an "available actions" panel. */
export function publicToolList(): Array<{ name: string; description: string; kind: string }> {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, kind: t.kind }))
}

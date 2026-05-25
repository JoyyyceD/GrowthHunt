/**
 * ReAct agent loop — Thought / Action / Observation, MAX_STEPS hard cap.
 *
 * Architecture references:
 *   - ReAct paper (Yao et al.) — reason+act primitive
 *   - Anthropic Agent SDK / Cloudflare patterns — orchestrator-workers
 *   - Vercel AI SDK 6 ToolLoopAgent — stopWhen(stepCountIs(N)) default
 *   - Harness-engineering 2026 — layered exec/guardrails/lifecycle hooks
 *
 * Why custom (not Vercel SDK): MiniMax is the project LLM, no native tool
 * use or streaming. We emulate with strict JSON output per step.
 *
 * Per step the model returns:
 *   { thought: "...", action: { kind: "tool_call", tool: "...", params: {...} } }
 * or
 *   { thought: "...", action: { kind: "final_answer", reply: "..." } }
 * or
 *   { thought: "...", action: { kind: "approval_request", tool: "...", params: {...}, reason: "..." } }
 *
 * Loop terminates on:
 *   - action.kind === 'final_answer'
 *   - MAX_STEPS reached → force a wrap-up final_answer
 *   - WALL_CLOCK_MS exceeded → emit timeout final_answer
 *   - tool throws repeatedly → emit error final_answer
 *
 * Each step gets persisted to agent_steps for UI trace + observability.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson, workspaceContext, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'
import { findTool, toolsPromptCatalog, type OrchestratorTool, type ToolResult } from './tools'
import { defaultCanUseTool, type CanUseToolFn } from './permissions'
import type { GtmMessage } from './types'

const MAX_STEPS = 5
const WALL_CLOCK_MS = 110_000   // < route maxDuration (120s)
const MAX_REPEAT_FAILURES = 2

export interface LoopInput {
  workspace: Workspace
  userId: string
  conversationId: string
  /** Last N persisted gtm_messages for context. */
  history: GtmMessage[]
  /** The new user turn. */
  message: string
  /** Parent gtm_tasks row (the chat_turn task wrapping this loop). */
  turnTaskId: string
  /** Permission gate. Defaults to defaultCanUseTool. */
  canUseTool?: CanUseToolFn
  /** Optional tool name suggested by the triage stage; threaded into prompt. */
  toolHint?: string
  /** Streaming hook — invoked each time a new StepTrace is persisted. */
  onStep?: (step: StepTrace) => void
}

export interface StepTrace {
  step_index: number
  thought: string
  action_kind: 'tool_call' | 'final_answer' | 'approval_request' | 'error'
  tool_name?: string
  tool_params?: unknown
  observation?: string
  task_id?: string
  duration_ms: number
}

export interface LoopOutput {
  finalAnswer: string
  toolUsed: string                  // last tool name or 'final_answer'
  routeTo?: string                  // honored from last tool result
  followups?: string[]
  steps: StepTrace[]
  approvalRequest?: {
    tool: string
    params: unknown
    reason: string
  }
  taskId?: string                   // last produced task id
}

// ── prompt building ───────────────────────────────────────────────────────

function historyToTranscript(history: GtmMessage[]): string {
  return history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 400)}`)
    .join('\n')
}

function stepHistoryToTranscript(steps: StepTrace[]): string {
  if (steps.length === 0) return '(no prior steps this turn)'
  return steps.map((s) => {
    const lines: string[] = [`Step ${s.step_index} — thought: ${s.thought.slice(0, 200)}`]
    if (s.action_kind === 'tool_call') {
      lines.push(`  action: tool_call(${s.tool_name}, ${JSON.stringify(s.tool_params).slice(0, 200)})`)
      lines.push(`  observation: ${(s.observation || '').slice(0, 400)}`)
    } else {
      lines.push(`  action: ${s.action_kind}`)
    }
    return lines.join('\n')
  }).join('\n')
}

function buildSystem(ws: Workspace): string {
  return withVoice(
    'You are the GrowthHunt GTM orchestrator running a ReAct loop. Each turn you '
    + 'pick ONE next action: call a tool, request approval for a sensitive tool, or '
    + 'give a final answer. You can call up to ' + MAX_STEPS + ' tools in a row before '
    + 'you must produce a final answer. Use tools when they help; do NOT call a tool '
    + 'just to call one. After a tool returns, decide if you need another tool or can '
    + 'now answer the user. Reply with ONLY a JSON object — no prose, no fences.',
    ws.voice,
  )
}

function buildUserPrompt(ws: Workspace, history: GtmMessage[], userMessage: string, steps: StepTrace[], stepBudget: number, toolHint?: string): string {
  return [
    `WORKSPACE CONTEXT:\n${workspaceContext(ws)}`,
    '',
    'TOOL CATALOG (param* = required, only tools eligible for this workspace are shown):',
    toolsPromptCatalog(ws),
    toolHint ? `\nTRIAGE HINT — the upstream classifier suggested using \`${toolHint}\`. Use it unless you have a strong reason to pick differently.` : '',
    '',
    'CONVERSATION SO FAR:',
    historyToTranscript(history),
    '',
    `NEW USER MESSAGE:\n${userMessage}`,
    '',
    'THIS-TURN STEPS SO FAR:',
    stepHistoryToTranscript(steps),
    '',
    `Steps remaining: ${stepBudget}.`,
    'Return JSON exactly:',
    '{',
    '  "thought": "<1-2 sentences — why this next action>",',
    '  "action": {',
    '    "kind": "tool_call" | "final_answer" | "approval_request",',
    '    "tool": "<tool name>",     // for tool_call or approval_request',
    '    "params": { ... },         // for tool_call or approval_request',
    '    "reply": "<markdown reply>" // for final_answer ONLY',
    '    "reason": "<why approval>" // for approval_request ONLY',
    '  }',
    '}',
    '',
    'Rules:',
    '- Prefer route tools (open_*) when the user asked to "go to" or "show me" a page.',
    '- Prefer execute tools when the user asked for a result.',
    '- After 2-3 tools, START synthesizing — produce final_answer, do not chain forever.',
    '- final_answer.reply MUST cite the artifacts the tools produced (with their deep links).',
  ].join('\n')
}

// ── one-step classify ────────────────────────────────────────────────────

interface ClassifierResp {
  thought?: string
  action?: {
    kind?: string
    tool?: string
    params?: Record<string, unknown>
    reply?: string
    reason?: string
  }
}

async function classifyStep(ws: Workspace, history: GtmMessage[], userMessage: string, steps: StepTrace[], stepBudget: number, toolHint?: string): Promise<ClassifierResp> {
  const raw = await callAgent({
    system: buildSystem(ws),
    user: buildUserPrompt(ws, history, userMessage, steps, stepBudget, toolHint),
    maxTokens: 800,
    temperature: 0.2,
  })
  if (!raw) return { action: { kind: 'final_answer', reply: 'The orchestrator LLM is unreachable right now. Try again in a moment.' } }
  const parsed = extractJson<ClassifierResp>(raw)
  if (!parsed || !parsed.action) return { thought: 'parse-failed', action: { kind: 'final_answer', reply: "I couldn't form a plan. Try rephrasing — e.g. 'audit my landing page' or 'find 5 creators'." } }
  return parsed
}

// ── persistence ───────────────────────────────────────────────────────────

async function persistStep(input: LoopInput, step: StepTrace): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('agent_steps').insert({
      workspace_id: input.workspace.id,
      conversation_id: input.conversationId,
      turn_task_id: input.turnTaskId,
      step_index: step.step_index,
      thought: step.thought.slice(0, 1000),
      action_kind: step.action_kind,
      tool_name: step.tool_name,
      tool_params: step.tool_params,
      observation: step.observation?.slice(0, 2000),
      task_id: step.task_id,
      duration_ms: step.duration_ms,
    })
  } catch (err) {
    console.error('[loop] persistStep failed:', (err as Error).message)
  }
  // Fire streaming callback after persistence so SSE consumers see a fully
  // recorded step.
  try { input.onStep?.(step) } catch { /* noop */ }
}

// ── main loop ─────────────────────────────────────────────────────────────

export async function runReactLoop(input: LoopInput): Promise<LoopOutput> {
  const start = Date.now()
  const steps: StepTrace[] = []
  const failureCounts = new Map<string, number>()
  const canUseTool = input.canUseTool ?? defaultCanUseTool
  let lastToolResult: ToolResult | null = null
  let lastToolName = ''

  while (steps.length < MAX_STEPS && Date.now() - start < WALL_CLOCK_MS) {
    const stepBudget = MAX_STEPS - steps.length
    const stepStart = Date.now()
    const decision = await classifyStep(input.workspace, input.history, input.message, steps, stepBudget, input.toolHint)
    const thought = String(decision.thought ?? '').slice(0, 800)
    const action = decision.action || { kind: 'final_answer', reply: 'Done.' }
    const kind = action.kind as StepTrace['action_kind']

    // Branch by action kind.
    if (kind === 'final_answer') {
      const trace: StepTrace = { step_index: steps.length, thought, action_kind: 'final_answer', duration_ms: Date.now() - stepStart }
      steps.push(trace)
      await persistStep(input, trace)
      return {
        finalAnswer: String(action.reply ?? lastToolResult?.summary ?? 'Done.').slice(0, 4000),
        toolUsed: lastToolName || 'final_answer',
        routeTo: lastToolResult?.routeTo,
        followups: lastToolResult?.followups,
        steps,
        taskId: lastToolResult?.taskId,
      }
    }

    if (kind === 'approval_request') {
      const toolName = String(action.tool || '')
      const trace: StepTrace = {
        step_index: steps.length,
        thought,
        action_kind: 'approval_request',
        tool_name: toolName,
        tool_params: action.params ?? {},
        observation: action.reason || 'Tool requires user approval',
        duration_ms: Date.now() - stepStart,
      }
      steps.push(trace)
      await persistStep(input, trace)
      return {
        finalAnswer: `I want to run **${toolName}** — that\'s a sensitive action. ${action.reason || 'Approve below to proceed.'}`,
        toolUsed: 'approval_request',
        steps,
        approvalRequest: { tool: toolName, params: action.params ?? {}, reason: action.reason || '' },
      }
    }

    if (kind === 'tool_call') {
      const toolName = String(action.tool || '')
      const tool = findTool(toolName)
      if (!tool) {
        const trace: StepTrace = { step_index: steps.length, thought, action_kind: 'error', tool_name: toolName, observation: `Unknown tool: ${toolName}`, duration_ms: Date.now() - stepStart }
        steps.push(trace)
        await persistStep(input, trace)
        continue   // give model another chance
      }
      // Permission gate (replaces the old APPROVAL_REQUIRED set).
      const toolParams = (action.params ?? {}) as Record<string, unknown>
      const toolCtx = { workspace: input.workspace, userId: input.userId, conversationId: input.conversationId, turnTaskId: input.turnTaskId }
      const permission = canUseTool(tool, toolParams, toolCtx)
      if (permission.decision === 'deny') {
        const trace: StepTrace = {
          step_index: steps.length,
          thought,
          action_kind: 'error',
          tool_name: toolName,
          tool_params: toolParams,
          observation: `Denied: ${permission.reason}`,
          duration_ms: Date.now() - stepStart,
        }
        steps.push(trace)
        await persistStep(input, trace)
        return {
          finalAnswer: `I can't run **${toolName}** here — ${permission.reason}`,
          toolUsed: toolName,
          steps,
        }
      }
      if (permission.decision === 'ask') {
        const trace: StepTrace = {
          step_index: steps.length,
          thought,
          action_kind: 'approval_request',
          tool_name: toolName,
          tool_params: toolParams,
          observation: permission.reason || 'This tool requires user approval.',
          duration_ms: Date.now() - stepStart,
        }
        steps.push(trace)
        await persistStep(input, trace)
        return {
          finalAnswer: `Approval needed for **${toolName}** — ${permission.reason || 'sensitive action.'}`,
          toolUsed: 'approval_request',
          steps,
          approvalRequest: { tool: toolName, params: toolParams, reason: permission.reason },
        }
      }

      // Execute
      let toolResult: ToolResult
      try {
        toolResult = await runTool(tool, action.params ?? {}, input)
      } catch (err) {
        const trace: StepTrace = {
          step_index: steps.length,
          thought,
          action_kind: 'error',
          tool_name: toolName,
          tool_params: action.params,
          observation: `Tool ${toolName} threw: ${(err as Error).message}`,
          duration_ms: Date.now() - stepStart,
        }
        steps.push(trace)
        await persistStep(input, trace)
        const fc = (failureCounts.get(toolName) ?? 0) + 1
        failureCounts.set(toolName, fc)
        if (fc >= MAX_REPEAT_FAILURES) {
          return {
            finalAnswer: `I tried **${toolName}** ${fc} times and it kept failing: ${(err as Error).message}. Please check the agent page directly.`,
            toolUsed: toolName,
            steps,
          }
        }
        continue
      }
      lastToolResult = toolResult
      lastToolName = toolName
      const trace: StepTrace = {
        step_index: steps.length,
        thought,
        action_kind: 'tool_call',
        tool_name: toolName,
        tool_params: action.params,
        observation: toolResult.summary.slice(0, 2000),
        task_id: toolResult.taskId,
        duration_ms: Date.now() - stepStart,
      }
      steps.push(trace)
      await persistStep(input, trace)
      // If the tool already returned a routeTo, treat that as terminal
      if (toolResult.routeTo && tool.kind === 'route') {
        return {
          finalAnswer: toolResult.summary,
          toolUsed: toolName,
          routeTo: toolResult.routeTo,
          followups: toolResult.followups,
          steps,
          taskId: toolResult.taskId,
        }
      }
      // Otherwise loop — model gets to react to the observation
      continue
    }

    // Unknown action kind — treat as final
    const trace: StepTrace = { step_index: steps.length, thought, action_kind: 'error', observation: `Unknown action kind: ${kind}`, duration_ms: Date.now() - stepStart }
    steps.push(trace)
    await persistStep(input, trace)
    break
  }

  // Force a final answer using last tool result + brief synthesis.
  const cause = Date.now() - start >= WALL_CLOCK_MS ? 'timeout' : 'step_budget'
  const fallback = lastToolResult?.summary || `I hit my ${cause === 'timeout' ? 'time' : 'step'} budget before finishing. Try a more specific ask.`
  return {
    finalAnswer: fallback,
    toolUsed: lastToolName || 'budget_exhausted',
    routeTo: lastToolResult?.routeTo,
    followups: lastToolResult?.followups,
    steps,
    taskId: lastToolResult?.taskId,
  }
}

async function runTool(tool: OrchestratorTool, params: Record<string, unknown>, input: LoopInput): Promise<ToolResult> {
  return tool.run(params, { workspace: input.workspace, userId: input.userId, conversationId: input.conversationId, turnTaskId: input.turnTaskId })
}

// ── resume after approval ─────────────────────────────────────────────────

export interface ApprovalResumeInput extends LoopInput {
  approval: { tool: string; params: Record<string, unknown>; approved: boolean }
}

export async function resumeAfterApproval(input: ApprovalResumeInput): Promise<LoopOutput> {
  if (!input.approval.approved) {
    return {
      finalAnswer: `Approval denied for **${input.approval.tool}** — nothing was sent.`,
      toolUsed: input.approval.tool,
      steps: [],
    }
  }
  const tool = findTool(input.approval.tool)
  if (!tool) {
    return { finalAnswer: `Tool not found: ${input.approval.tool}`, toolUsed: input.approval.tool, steps: [] }
  }
  const start = Date.now()
  let toolResult: ToolResult
  try {
    toolResult = await tool.run(input.approval.params, { workspace: input.workspace, userId: input.userId, conversationId: input.conversationId, turnTaskId: input.turnTaskId })
  } catch (err) {
    return { finalAnswer: `Approved tool ${input.approval.tool} threw: ${(err as Error).message}`, toolUsed: input.approval.tool, steps: [] }
  }
  const trace: StepTrace = {
    step_index: 0,
    thought: 'User-approved execution',
    action_kind: 'tool_call',
    tool_name: input.approval.tool,
    tool_params: input.approval.params,
    observation: toolResult.summary.slice(0, 2000),
    task_id: toolResult.taskId,
    duration_ms: Date.now() - start,
  }
  await persistStep(input, trace)
  return {
    finalAnswer: toolResult.summary,
    toolUsed: input.approval.tool,
    routeTo: toolResult.routeTo,
    followups: toolResult.followups,
    steps: [trace],
    taskId: toolResult.taskId,
  }
}

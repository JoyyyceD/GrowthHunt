/**
 * Scout ReAct loop — native tool calling, no JSON-in-text parsing.
 *
 * One call = one user turn. The model may chain up to MAX_STEPS tool rounds;
 * every round is persisted to agent_steps (UI process lines) and surfaced as
 * ScoutEvents over SSE. Long jobs (onboarding) do NOT run through this loop —
 * they get their own pipeline task (decision 7.4).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspace } from '@/lib/workspace/store'
import { coreBlock } from '@/lib/orchestrator/memory'
import { artifactContextBlock } from './artifacts'
import { assertBudget, chatStream, ScoutBudgetError, type ChatStreamInput, type ChatStreamResult } from './client'
import { SCOUT_TOOLS, availableTools } from './tools'
import type { ChatMessage, ScoutEvent, ScoutTool, StepRecord } from './types'

export const MAX_STEPS = 5
const OBSERVATION_LIMIT = 6_000
const PERSIST_LIMIT = 2_000

const SCOUT_SYSTEM = `You are Scout, the user's AI growth teammate at GrowthHunt — a sharp, warm, no-fluff marketing operator. You speak in first person, plainly, and you always ground advice in the user's actual brand and real data.

Rules:
- Use tools to look things up instead of guessing. Never invent stats, prices, or competitor facts — if a number isn't in your sources, don't ship it.
- Posts you queue are drafts ('proposed'); the user approves before anything goes live.
- When a decision is genuinely the user's (tone trade-offs, budget, what to publish), use ask_user instead of assuming.
- Keep replies tight. Lead with the answer, then the reasoning that matters.
- No startup buzzwords ("revolutionary", "game-changing"), no fake urgency.`

export interface ScoutTurnInput {
  workspaceId: string
  conversationId?: string | null
  userMessage: string
  history?: ChatMessage[]
  emit?: (event: ScoutEvent) => void
  model?: string
  /** Test seams — all default to real implementations. */
  io?: Partial<ScoutIO>
}

export interface ScoutIO {
  chat: (input: ChatStreamInput) => Promise<ChatStreamResult>
  assertBudget: (workspaceId: string) => Promise<void>
  buildContext: (workspaceId: string) => Promise<string>
  persistStep: (workspaceId: string, conversationId: string | null, step: StepRecord) => Promise<void>
  tools: Record<string, ScoutTool & { available: boolean }>
}

export interface ScoutTurnResult {
  reply: string
  steps: StepRecord[]
  endedWith: 'final_answer' | 'ask_user' | 'budget' | 'max_steps' | 'error'
}

async function defaultBuildContext(workspaceId: string): Promise<string> {
  const [ws, notes, docs] = await Promise.all([
    getWorkspace(workspaceId),
    coreBlock(workspaceId).catch(() => ''),
    artifactContextBlock(workspaceId).catch(() => ''),
  ])
  if (!ws) return ''
  const parts = [
    `Workspace: ${ws.name} (${ws.url})`,
    ws.one_liner && `One-liner: ${ws.one_liner}`,
    ws.icp_summary && `ICP: ${ws.icp_summary}`,
    ws.positioning && `Positioning: ${ws.positioning}`,
    ws.key_messages?.length ? `Key messages: ${ws.key_messages.join(' | ')}` : null,
    ws.competitors?.length ? `Competitors: ${ws.competitors.map(c => c.name).join(', ')}` : null,
    docs && `Knowledge base (use artifact_read for full text):\n${docs}`,
    notes && `Notes:\n${notes}`,
  ].filter(Boolean)
  return parts.join('\n')
}

async function defaultPersistStep(workspaceId: string, conversationId: string | null, step: StepRecord): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('agent_steps').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      step_index: step.stepIndex,
      action_kind: step.actionKind,
      tool_name: step.toolName ?? null,
      tool_params: step.toolParams ?? null,
      observation: step.observation?.slice(0, PERSIST_LIMIT) ?? null,
      tokens_in: step.tokensIn ?? null,
      tokens_out: step.tokensOut ?? null,
      duration_ms: step.durationMs,
    })
  } catch (e) {
    console.error('[scout] persistStep failed:', (e as Error).message)
  }
}

function safeParse(args: string): Record<string, unknown> {
  try {
    const v = JSON.parse(args || '{}')
    return typeof v === 'object' && v !== null ? v : {}
  } catch {
    return {}
  }
}

export async function runScoutTurn(input: ScoutTurnInput): Promise<ScoutTurnResult> {
  const emit = input.emit || (() => {})
  const io: ScoutIO = {
    chat: input.io?.chat || chatStream,
    assertBudget: input.io?.assertBudget || assertBudget,
    buildContext: input.io?.buildContext || defaultBuildContext,
    persistStep: input.io?.persistStep || defaultPersistStep,
    tools: input.io?.tools || SCOUT_TOOLS,
  }
  const steps: StepRecord[] = []
  const conversationId = input.conversationId ?? null

  try {
    await io.assertBudget(input.workspaceId)
  } catch (e) {
    if (e instanceof ScoutBudgetError) {
      const reply = "I've hit today's working budget for this workspace — I'll be back tomorrow. Anything already queued is unaffected."
      emit({ type: 'text_delta', text: reply })
      emit({ type: 'done', reply })
      return { reply, steps, endedWith: 'budget' }
    }
    throw e
  }

  const context = await io.buildContext(input.workspaceId)
  const toolDefs = Object.entries(io.tools)
    .filter(([, t]) => t.available)
    .map(([name, t]) => ({ ...t.def, name }))
  const today = `Today is ${new Date().toDateString()}.`
  const messages: ChatMessage[] = [
    { role: 'system', content: `${SCOUT_SYSTEM}\n\n${today}${context ? `\n\n--- Current workspace ---\n${context}` : ''}` },
    ...(input.history || []),
    { role: 'user', content: input.userMessage },
  ]

  let finalText = ''
  for (let stepIndex = 0; stepIndex < MAX_STEPS; stepIndex++) {
    const started = Date.now()
    let result: ChatStreamResult
    try {
      result = await io.chat({
        messages,
        tools: toolDefs,
        model: input.model,
        workspaceId: input.workspaceId,
        kind: 'chat',
        onDelta: text => emit({ type: 'text_delta', text }),
      })
    } catch (e) {
      const message = (e as Error).message
      emit({ type: 'error', message })
      return { reply: finalText, steps, endedWith: 'error' }
    }

    if (!result.toolCalls.length) {
      finalText = result.content
      const step: StepRecord = {
        stepIndex,
        actionKind: 'final_answer',
        tokensIn: result.usage.promptTokens,
        tokensOut: result.usage.completionTokens,
        durationMs: Date.now() - started,
      }
      steps.push(step)
      await io.persistStep(input.workspaceId, conversationId, step)
      emit({ type: 'done', reply: finalText })
      return { reply: finalText, steps, endedWith: 'final_answer' }
    }

    messages.push({
      role: 'assistant',
      content: result.content || null,
      tool_calls: result.toolCalls,
    })

    let askedUser = false
    for (const call of result.toolCalls) {
      const tool = io.tools[call.name]
      const params = safeParse(call.arguments)
      const label = tool?.label(params) ?? call.name
      emit({ type: 'step', tool: call.name, label, status: 'start' })
      const toolStarted = Date.now()
      let observation: string
      if (!tool || !tool.available) {
        observation = `Error: unknown tool "${call.name}"`
      } else {
        try {
          observation = await tool.run(params, {
            workspaceId: input.workspaceId,
            conversationId,
            emit,
          })
        } catch (e) {
          observation = `Error: ${(e as Error).message}`
        }
      }
      const failed = observation.startsWith('Error:')
      emit({ type: 'step', tool: call.name, label, status: failed ? 'error' : 'done' })
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: observation.slice(0, OBSERVATION_LIMIT),
      })
      const step: StepRecord = {
        stepIndex,
        actionKind: 'tool_call',
        toolName: call.name,
        toolParams: params,
        observation,
        tokensIn: result.usage.promptTokens,
        tokensOut: result.usage.completionTokens,
        durationMs: Date.now() - toolStarted,
      }
      steps.push(step)
      await io.persistStep(input.workspaceId, conversationId, step)
      if (observation === 'ASK_USER_SENT') askedUser = true
    }

    if (askedUser) {
      const reply = result.content || ''
      emit({ type: 'done', reply })
      return { reply, steps, endedWith: 'ask_user' }
    }
  }

  const reply = finalText || "I ran out of steps on this one — tell me to continue and I'll pick up where I left off."
  emit({ type: 'done', reply })
  return { reply, steps, endedWith: 'max_steps' }
}

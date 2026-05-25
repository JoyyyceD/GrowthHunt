/**
 * Triage stage — the missing "chat" layer.
 *
 * Before entering the ReAct loop, ask MiniMax for a fast conversational reply
 * plus a yes/no on whether a tool call is needed. This solves the "agent jumps
 * straight to tools" problem and gives the user a genspark-style preamble
 * bubble ("got it, let me audit that…") that arrives before any work runs.
 *
 * Returns:
 *   - reply        : 1-3 sentence conversational reply, ALWAYS surfaced
 *   - needs_tools  : when false, that reply IS the final answer
 *   - tool_hint    : optional suggestion to nudge the ReAct loop's first step
 *
 * One MiniMax call, ~1s, ~400 tokens.
 */
import { callAgent, extractJson, workspaceContext, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'
import type { GtmMessage } from './types'
import { enabledTools } from './tools'

export interface TriageResult {
  reply: string
  needs_tools: boolean
  tool_hint?: string
}

function historyTranscript(history: GtmMessage[]): string {
  const slice = history.slice(-6)
  if (slice.length === 0) return '(no prior turns)'
  return slice.map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`).join('\n')
}

export async function triageMessage(ws: Workspace, history: GtmMessage[], message: string): Promise<TriageResult> {
  const tools = enabledTools(ws).map((t) => `- ${t.name}: ${t.description.slice(0, 90)}`).join('\n')
  const system = withVoice(
    [
      'You are the GrowthHunt GTM assistant — a friendly senior growth advisor.',
      '',
      'For each user message:',
      '1. ALWAYS write 1-3 conversational sentences acknowledging what they want. Be warm but tight. No bullet lists in this reply.',
      '2. Decide whether the message needs a TOOL CALL (data lookup, agent run, audit, scan, draft) or whether your conversational reply is sufficient.',
      '3. If a tool is needed, hint the tool by name (must be in the catalog).',
      '',
      'Reply with ONLY a JSON object — no fences, no prose around it:',
      '{ "reply": "<your 1-3 sentence reply>", "needs_tools": true|false, "tool_hint": "<tool_name, optional>" }',
    ].join('\n'),
    ws.voice,
  )
  const user = [
    `WORKSPACE:\n${workspaceContext(ws)}`,
    '',
    'AVAILABLE TOOLS (you do NOT run them here — only hint at the right one):',
    tools,
    '',
    'RECENT CONVERSATION:',
    historyTranscript(history),
    '',
    `NEW USER MESSAGE:\n${message}`,
    '',
    'Decision rules for needs_tools:',
    '- Greetings, thank-yous, follow-up "why?" questions, opinion asks, system questions → needs_tools=false (just chat back).',
    '- "audit / draft / find / run / scan / snapshot / refresh / create" verbs → needs_tools=true.',
    '- "what is my X / show me my Y" about workspace state → needs_tools=true, tool_hint="get_workspace".',
    '- Ambiguous / underspecified ("help me grow", "what should I do") → needs_tools=false, ask a clarifying question in your reply.',
    '',
    'Return JSON only.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 400, temperature: 0.4 })
  if (!raw) {
    return { reply: 'Got it. Let me work on that.', needs_tools: true }
  }
  const parsed = extractJson<{ reply?: unknown; needs_tools?: unknown; tool_hint?: unknown }>(raw)
  if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    return { reply: 'Got it. Let me work on that.', needs_tools: true }
  }
  return {
    reply: parsed.reply.slice(0, 600),
    needs_tools: Boolean(parsed.needs_tools),
    tool_hint: typeof parsed.tool_hint === 'string' && parsed.tool_hint.trim() ? parsed.tool_hint.trim() : undefined,
  }
}

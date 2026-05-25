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
      'CORE PRINCIPLE: Never auto-run tools when the user is asking for advice, opinion, clarification, or chit-chatting. Tools are ONLY for unambiguous task requests. When in doubt, DO NOT run a tool — chat back and ask one clarifying question instead.',
      '',
      'For each user message:',
      '1. ALWAYS write 1-3 conversational sentences acknowledging what they want. Match the user\'s language (English/中文/etc). Be warm but tight. No bullet lists, no markdown headers in this reply.',
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
    '',
    'TRUE (run a tool) — only when ALL of these hold:',
    '  - User used an imperative action verb in English (audit, draft, run, scan, find, create, snapshot, refresh, generate, train, build, post, send) or in Chinese (跑, 审, 扫, 抓, 找, 生成, 起草, 训练, 发, 发布).',
    '  - The request is specific: a URL, a name, a count, a target — not abstract.',
    '  - You can confidently map it to exactly ONE tool in the catalog.',
    '',
    'FALSE (just chat back) — for any of these:',
    '  - Greetings ("hi", "你好", "嗨"), thank-yous ("thanks", "谢谢"), good-byes.',
    '  - Open-ended advice ("what should I do?", "我现在该做什么", "how do I grow?", "怎么涨粉", "help me grow", "give me ideas").',
    '  - Opinion / explanation asks ("what do you think?", "why does X work?", "为什么", "解释一下").',
    '  - Meta-questions about the assistant / platform ("what can you do?", "你能干啥", "how does this work?").',
    '  - Follow-up clarifications without a new task ("really?", "are you sure?", "wait what?").',
    '  - Ambiguous / underspecified — missing the URL, the count, the target. ASK a clarifying question in your reply.',
    '',
    'IMPORTANT — DO NOT call start_playbook, run_icp_agent, or any heavy workflow tool just because the user vaguely asked for help. Those require explicit asks like "run the onboarding playbook" or "draft my ICP from this brief".',
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

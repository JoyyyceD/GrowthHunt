/**
 * Shared LLM helpers for the agent layer.
 *
 * Wraps minimaxChat with:
 *   - structured JSON extraction (extractJson)
 *   - voice-injecting prompt builder (withVoice) so every agent's output
 *     can match the workspace's trained voice profile
 *   - workspace-context prompt builder so every agent has access to the
 *     shared brain
 */
import { minimaxChat } from '@/lib/viralx/minimax'
import type { Workspace, VoiceProfile } from '@/lib/workspace/types'

export interface AgentCallOpts {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}

export async function callAgent(opts: AgentCallOpts): Promise<string | null> {
  if (!process.env.MINIMAX_API_KEY) return null
  try {
    return await minimaxChat({
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      temperature: opts.temperature ?? 0.2,
      maxTokens: opts.maxTokens ?? 1200,
    })
  } catch (err) {
    console.error('[agent] LLM call failed:', (err as Error).message)
    return null
  }
}

/** Extract the first JSON object or array from a model response. */
export function extractJson<T = unknown>(raw: string | null): T | null {
  if (!raw) return null
  const match = raw.match(/[[{][\s\S]*[\]}]/)
  if (!match) return null
  try { return JSON.parse(match[0]) as T } catch { return null }
}

/** Pull the first JSON array of strings; tolerant of trailing prose. */
export function extractJsonArray(raw: string | null): string[] | null {
  if (!raw) return null
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    const arr = JSON.parse(match[0]) as unknown
    if (!Array.isArray(arr)) return null
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  } catch { return null }
}

/** Build a "workspace context" preamble every agent can paste into its user msg. */
export function workspaceContext(ws: Workspace): string {
  const lines: string[] = []
  lines.push(`Product: ${ws.name} (${ws.url})`)
  if (ws.one_liner) lines.push(`One-liner: ${ws.one_liner}`)
  if (ws.positioning) lines.push(`Positioning: ${ws.positioning}`)
  if (ws.icp_summary) lines.push(`ICP: ${ws.icp_summary}`)
  if (ws.icp_segments.length > 0) {
    lines.push('ICP segments:')
    for (const s of ws.icp_segments.slice(0, 3)) {
      lines.push(`  - ${s.name}${s.jtbd ? `: jobs = ${s.jtbd}` : ''}${(s.pains?.length ?? 0) > 0 ? `, pains = ${(s.pains || []).join('; ')}` : ''}`)
    }
  }
  if (ws.key_messages.length > 0) {
    lines.push(`Key messages: ${ws.key_messages.slice(0, 3).join(' | ')}`)
  }
  if (ws.competitors.length > 0) {
    lines.push(`Competitors: ${ws.competitors.map((c) => c.name).filter(Boolean).join(', ')}`)
  }
  return lines.join('\n')
}

/** Append "write in this voice" instructions to a system prompt. */
export function withVoice(systemPrompt: string, voice: VoiceProfile | null | undefined): string {
  if (!voice || !voice.summary) return systemPrompt
  const bits: string[] = []
  bits.push('Match the founder\'s voice:')
  bits.push(`- Profile: ${voice.summary}`)
  if (voice.tone) bits.push(`- Tone: ${voice.tone}`)
  if (voice.emoji) bits.push(`- Emoji use: ${voice.emoji}`)
  if (voice.formatting) bits.push(`- Formatting: ${voice.formatting}`)
  if (voice.sentence_avg) bits.push(`- Sentence length: ~${voice.sentence_avg} words avg`)
  if (voice.sample_passages?.length) {
    bits.push('- Sample passages (mimic cadence, NOT content):')
    for (const p of voice.sample_passages.slice(0, 3)) {
      bits.push(`  > ${p.slice(0, 240)}`)
    }
  }
  return `${systemPrompt}\n\n${bits.join('\n')}`
}

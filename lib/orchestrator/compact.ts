/**
 * Conversation compaction — replace older assistant turns that ran tools with
 * a one-line summary so the ReAct prompt stays under budget.
 *
 * Pattern lifted from ClaudeCode src/services/compact/autoCompact.ts but
 * massively simplified: no LLM call (MiniMax is already the bottleneck), just
 * deterministic truncation. Older messages collapse to "ASSISTANT: ran <tool>
 * — <60-char snippet>". Recent N turns stay verbatim.
 *
 * Called from chat.ts before passing history into runReactLoop.
 */
import type { GtmMessage } from './types'

export interface CompactOptions {
  /** Keep this many trailing messages untouched. Default 6. */
  keepLast?: number
  /** Per-message char budget for compacted entries. Default 80. */
  snippetLen?: number
}

/**
 * Synthetic compacted assistant turn. Same shape as GtmMessage so loop code
 * can treat it uniformly, but with `id` prefixed so we never persist it.
 */
function synthMsg(content: string, conversation_id: string, created_at: string): GtmMessage {
  return {
    id: 'compact-' + created_at,
    conversation_id,
    role: 'assistant',
    content,
    tool_call: null,
    task_id: null,
    created_at,
  }
}

function snippet(s: string | null | undefined, n: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  return t.slice(0, n - 1).trimEnd() + '…'
}

export function compactHistory(messages: GtmMessage[], opts: CompactOptions = {}): GtmMessage[] {
  const keepLast = opts.keepLast ?? 6
  const snippetLen = opts.snippetLen ?? 80
  if (messages.length <= keepLast) return messages

  const head = messages.slice(0, messages.length - keepLast)
  const tail = messages.slice(messages.length - keepLast)

  // Compact `head`: collapse runs of (user → assistant-with-tool) into a single
  // synthetic assistant line summarising what got run. Plain assistant replies
  // (no tool_call) also shrink to one line. User messages survive in trimmed
  // form so the model still sees what was asked.
  const compacted: GtmMessage[] = []
  for (const m of head) {
    if (m.role === 'user') {
      compacted.push({ ...m, content: snippet(m.content, 160) })
      continue
    }
    if (m.role === 'assistant') {
      const tool = m.tool_call?.name && m.tool_call.name !== 'answer' && m.tool_call.name !== 'final_answer'
        ? m.tool_call.name
        : null
      const line = tool
        ? `[earlier] ran \`${tool}\` → ${snippet(m.content, snippetLen)}`
        : `[earlier] ${snippet(m.content, snippetLen)}`
      compacted.push(synthMsg(line, m.conversation_id, m.created_at))
      continue
    }
    // tool/other roles: drop
  }

  return [...compacted, ...tail]
}

/**
 * Tiny agent-context store — the data plane behind useGtmReadable.
 *
 * Pages register "what the user is looking at right now" (current task, ICP
 * draft, audited URL) via the useGtmReadable hook. ChatPanel reads everything
 * via snapshot() and ships it to /api/gtm/chat/stream as `page_context`.
 *
 * We tried adopting CopilotKit's useCopilotReadable directly (v1.57 has a
 * known issue where the readable tree stays empty in "headless" mode — when
 * you set up the provider but no real runtime). This module is a 60-LOC
 * substitute that works today. CopilotKit stays installed for future use
 * (generative UI, useCopilotAction frontend tool dispatch).
 *
 * Pattern is essentially CopilotKit's API in miniature:
 *   useGtmReadable(id, value, description)   → registers
 *   snapshotReadables()                       → JSON-stringified prompt block
 */
import { useEffect } from 'react'

interface ReadableEntry {
  id: string
  description: string
  value: unknown
  scope: 'global' | string
}

const store = new Map<string, ReadableEntry>()
type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  for (const l of listeners) { try { l() } catch { /* noop */ } }
}

export function registerReadable(entry: ReadableEntry) {
  store.set(entry.id, entry)
  notify()
}

export function unregisterReadable(id: string) {
  store.delete(id)
  notify()
}

export function getAllReadables(): ReadableEntry[] {
  return Array.from(store.values())
}

/**
 * Render registered readables as a single prompt block. Each entry becomes a
 * dashed line; values stringify with `JSON.stringify`. Strings pass through.
 */
export function snapshotReadables(): string {
  const entries = getAllReadables()
  if (entries.length === 0) return ''
  return entries.map((e) => {
    const v = typeof e.value === 'string' ? e.value : safeStringify(e.value)
    return `- ${e.id} (${e.description}):\n${indent(v, 2)}`
  }).join('\n')
}

function safeStringify(v: unknown): string {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}
function indent(s: string, n: number): string {
  const pad = ' '.repeat(n)
  return s.split('\n').map((l) => pad + l).join('\n')
}

/** Subscribe to store changes (used by ChatPanel to re-snapshot on update). */
export function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/**
 * React hook — registers a readable while the component is mounted, updates
 * on value change, and unregisters on unmount.
 */
export function useGtmReadable(id: string, value: unknown, description: string, scope: ReadableEntry['scope'] = 'global') {
  useEffect(() => {
    registerReadable({ id, description, value, scope })
    return () => { unregisterReadable(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, JSON.stringify(value), description, scope])
}

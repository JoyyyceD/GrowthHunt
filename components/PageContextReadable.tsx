'use client'

/**
 * Page-context readable bridge — a tiny client component that registers a
 * piece of page state with the agent context store so the chat agent can see
 * "what the user is looking at right now" without being told.
 *
 * Server components import this and pass the snapshot they computed. The
 * registration lives only while the page is mounted; navigating away
 * unregisters it automatically.
 *
 * Backed by `useGtmReadable` from `lib/agent-context/store`. We initially
 * tried CopilotKit's `useCopilotReadable` directly, but the v1.57 headless
 * mode doesn't expose the tree to consumers — see store.ts for context.
 *
 * Example (in a server page.tsx):
 *
 *   <PageContextReadable
 *     id="current_task"
 *     description="The gtm_tasks row the user is currently viewing"
 *     value={{ id: task.id, kind: task.kind, summary: task.summary, status: task.status }}
 *   />
 */
import { useGtmReadable } from '@/lib/agent-context/store'

interface Props {
  /** Stable identifier — used as the registration key. */
  id: string
  /** What this value represents, in natural language (the agent reads this). */
  description: string
  /** The snapshot. Will be JSON-serialised; keep it small. */
  value: unknown
}

export function PageContextReadable({ id, description, value }: Props) {
  useGtmReadable(id, value, description)
  return null
}

// (no debug log in production)


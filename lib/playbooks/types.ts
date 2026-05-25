/**
 * Playbook contracts.
 */
import type { Workspace } from '@/lib/workspace/types'
import type { TaskKind } from '@/lib/orchestrator/types'

export interface PlaybookContext {
  workspace: Workspace
  parentTaskId: string
  conversationId?: string | null
  /** Per-playbook free-form params (e.g. {topic: "..."} for launch_post). */
  params?: Record<string, unknown>
  /** Outputs of previously completed steps, keyed by step id. */
  priorOutputs: Record<string, unknown>
}

export interface PlaybookStepResult {
  ok: boolean
  output?: unknown
  error?: string
  summary?: string
}

export interface PlaybookStep {
  id: string
  kind: TaskKind
  label: string
  /** Skip if any of these workspace fields are missing. Used in onboarding to avoid re-running. */
  skipIf?: (ws: Workspace) => boolean
  /** Actually run the step. Receives PlaybookContext, can read prior outputs. */
  run(ctx: PlaybookContext): Promise<PlaybookStepResult>
}

export interface Playbook {
  id: string
  name: string
  description: string
  estimatedMinutes: number
  steps: PlaybookStep[]
}

/**
 * Workflows = real business processes the founder repeats.
 *
 * Different from playbooks (which were stateless agent chains) in 3 ways:
 *   1. Triggers: workflows can self-start (cron / event / chat) — not just manual
 *   2. Human gates: a step can pause the run and wait for user input
 *      (e.g. "pick which of these 3 drafts to ship")
 *   3. Artifacts: each step can emit a concrete business artifact (a tweet
 *      posted, an email sent, a PR opened, a campaign created) that the
 *      workflow_run tracks toward a final business outcome.
 */
import type { Workspace } from '@/lib/workspace/types'
import type { TaskTrigger, TaskKind } from '@/lib/orchestrator/types'

export type WorkflowStepKind =
  | 'agent'      // runs an agent + advances automatically
  | 'gate'       // pauses for human approval/input
  | 'external'   // emits a deep-link, user does the action on another platform

export interface WorkflowStepOk {
  ok: true
  output?: unknown
  summary?: string
  /** Concrete business artifact produced. */
  artifact?: WorkflowArtifact
  /** When kind='gate', the run pauses with this payload until /resume is called. */
  pause?: { reason: string; payload?: unknown }
}
export interface WorkflowStepErr { ok: false; error: string }
export type WorkflowStepResult = WorkflowStepOk | WorkflowStepErr

export interface WorkflowArtifact {
  kind: 'tweet' | 'email' | 'campaign' | 'pr' | 'draft' | 'report' | 'video_script' | 'leads_list'
  ref?: string                  // an id (tweet id, campaign id, etc.)
  url?: string                  // deep-link to it
  title?: string                // human label
}

export interface WorkflowContext {
  workspace: Workspace
  workflowRunId: string
  parentTaskId: string
  triggeredBy: TaskTrigger
  /** Conversation that kicked off the run, if any (chat-triggered runs). */
  conversationId?: string | null
  /** User-supplied initial params (e.g. {topic: '...'}). */
  inputs: Record<string, unknown>
  /** Outputs of previously completed steps, keyed by step id. */
  priorOutputs: Record<string, unknown>
  /** When resuming from a gate, the user's gate response. */
  resumeData?: unknown
}

export interface WorkflowStep {
  id: string
  kind: WorkflowStepKind
  label: string
  /**
   * For kind='agent', the underlying task kind this step records
   * (icp, voice, landing, …). Surfaced in the UI step list.
   */
  agentKind?: TaskKind
  /** Skip the step entirely if predicate returns true (e.g. already done). */
  skipIf?: (ws: Workspace, prior: Record<string, unknown>) => boolean
  run(ctx: WorkflowContext): Promise<WorkflowStepResult>
}

export type WorkflowTriggerKind = 'manual' | 'cron' | 'event'

export interface Workflow {
  id: string                            // 'daily_content_sprint', 'ship_a_feature', …
  name: string
  description: string
  /**
   * 'process' = stateful business process (gates/triggers/artifacts) shown on
   * the Workflows page. 'playbook' = synchronous gate-less agent chain shown on
   * the Playbooks page. Defaults to 'process' when omitted.
   */
  category?: 'process' | 'playbook'
  /** Tied to a real founder ritual / process this workflow replaces. */
  embodies: string
  estimatedMinutes: number
  /** Available triggers (cron schedule strings or event names). */
  triggers: Array<{
    kind: WorkflowTriggerKind
    cron?: string                       // for 'cron'
    event?: string                      // for 'event' (e.g. 'competitor_diff')
    note?: string
  }>
  /** Concrete business outcome we expect the workflow to produce. */
  outcome: string
  steps: WorkflowStep[]
}

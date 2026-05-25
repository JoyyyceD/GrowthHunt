/**
 * Shared types for the GTM orchestrator layer.
 */

export type TaskKind =
  | 'icp'
  | 'voice'
  | 'landing'
  | 'creator_outreach'
  | 'cold_email'
  | 'distribution'
  | 'radar'
  | 'ab'
  | 'competitor'
  | 'geo_audit'
  | 'playbook'
  | 'chat_turn'

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'awaiting_user'

export type TaskTrigger =
  | 'chat'
  | 'cron'
  | 'playbook'
  | 'event'
  | 'manual_page'

export interface GtmTask {
  id: string
  workspace_id: string | null
  conversation_id: string | null
  parent_task_id: string | null
  kind: TaskKind
  status: TaskStatus
  triggered_by: TaskTrigger
  input: Record<string, unknown>
  output: unknown
  summary: string | null
  error: string | null
  duration_ms: number | null
  scheduled_for: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface GtmMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_call: { name?: string; params?: unknown; route_to?: string; prefill?: unknown; ui?: { kind: string; props: Record<string, unknown> } } | null
  task_id: string | null
  created_at: string
}

export interface GtmConversation {
  id: string
  workspace_id: string
  title: string
  created_at: string
  last_message_at: string
}

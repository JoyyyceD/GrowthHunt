/**
 * Scout orchestration layer — shared types.
 *
 * Scout speaks the OpenAI chat-completions protocol (via OpenRouter), so the
 * message/tool shapes here mirror that wire format. ScoutEvent is the SSE
 * contract with the /scout frontend (decision 3.6): every variant maps 1:1 to
 * a UI block type.
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ToolCall {
  id: string
  name: string
  /** Raw JSON string as returned by the model. */
  arguments: string
}

export interface ChatMessage {
  role: ChatRole
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

/** OpenAI-format function tool definition. */
export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface PostDraft {
  platform: string
  content: string
  hook?: string
  scheduledFor?: string | null
  meta?: Record<string, unknown>
}

/** SSE events streamed to the workspace UI (decision 3.6 / 4.2). */
export type ScoutEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'step'; tool: string; label: string; status: 'start' | 'done' | 'error' }
  | { type: 'artifact_delta'; slug: string; text: string }
  | { type: 'artifact_done'; slug: string; title: string; rev: number }
  | { type: 'post_drafts'; drafts: PostDraft[] }
  | { type: 'ask_user'; question: string; options?: string[] }
  | { type: 'status'; stage: string; narration: string }
  | { type: 'done'; reply: string }
  | { type: 'error'; message: string }

export interface ToolContext {
  workspaceId: string
  conversationId?: string | null
  emit: (event: ScoutEvent) => void
}

export interface ScoutTool {
  def: ToolDef
  /** Short process-line label shown in the UI while the tool runs. */
  label: (params: Record<string, unknown>) => string
  run: (params: Record<string, unknown>, ctx: ToolContext) => Promise<string>
}

export interface StepRecord {
  stepIndex: number
  actionKind: 'tool_call' | 'final_answer'
  toolName?: string
  toolParams?: Record<string, unknown>
  observation?: string
  tokensIn?: number
  tokensOut?: number
  durationMs: number
}

export interface Usage {
  promptTokens: number
  completionTokens: number
  costUsd: number
}

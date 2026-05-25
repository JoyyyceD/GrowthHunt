/**
 * CanUseToolFn — per-call permission gate for orchestrator tools.
 *
 * Replaces the static APPROVAL_REQUIRED set with a function that can inspect
 * tool name, params, and workspace state. Returns:
 *   - 'allow' → run immediately
 *   - 'ask'   → surface approval_request to the user, pause loop
 *   - 'deny'  → refuse with reason, loop emits a final answer
 *
 * Pattern lifted from ClaudeCode src/hooks/useCanUseTool.ts. Centralised here
 * so policy decisions stay out of the loop and out of individual tools.
 */
import type { OrchestratorTool, ToolCtx } from './tools'

export type ToolDecision = 'allow' | 'ask' | 'deny'

export interface PermissionResult {
  decision: ToolDecision
  reason: string
}

export type CanUseToolFn = (
  tool: OrchestratorTool,
  params: Record<string, unknown>,
  ctx: ToolCtx,
) => PermissionResult

function num(v: unknown): number | null {
  const n = Number(v); return Number.isFinite(n) ? n : null
}

export const defaultCanUseTool: CanUseToolFn = (tool, params, ctx) => {
  // 1. Sensitive sends — always pause for approval.
  if (tool.name === 'draft_cold_email') {
    const csv = typeof params.targets_csv === 'string' ? params.targets_csv : ''
    const lines = csv.split('\n').filter((l) => l.trim()).length
    return { decision: 'ask', reason: lines > 10
      ? `Will draft ${lines} cold emails — review before any send.`
      : 'Cold email drafts can trigger real sends downstream.' }
  }

  // 2. Multi-platform launches — expensive + multi-channel, gate it.
  if (tool.name === 'launch_orchestrator_init') {
    return { decision: 'ask', reason: 'Multi-platform launch campaigns post to PH/HN/Reddit etc. — confirm before creating.' }
  }

  // 3. Large fan-outs — cap creator outreach picks before user sees it.
  if (tool.name === 'draft_creator_outreach') {
    const picks = num(params.picks) ?? 12
    if (picks > 8) {
      return { decision: 'ask', reason: `Drafting ${picks} creator DMs at once — confirm scope.` }
    }
  }

  // 4. Workflow start — these are long-running with cron triggers, ask.
  if (tool.name === 'start_workflow') {
    const id = String(params.workflow_id ?? '')
    if (id === 'find_customers' || id === 'defend_position') {
      return { decision: 'ask', reason: `Workflow ${id} runs across multiple agents and may produce outbound artifacts.` }
    }
  }

  // 5. Spawn limits — refuse if fan-out is too wide.
  if (tool.name === 'spawn_agents') {
    const agents = Array.isArray(params.agents) ? params.agents : []
    if (agents.length === 0) {
      return { decision: 'deny', reason: 'spawn_agents needs at least one agent spec.' }
    }
    if (agents.length > 3) {
      return { decision: 'deny', reason: 'spawn_agents caps at 3 parallel agents per turn.' }
    }
  }

  // 6. Cheap reads, routes, and the fallback answer — always allow.
  if (tool.kind === 'route' || tool.kind === 'answer') {
    return { decision: 'allow', reason: '' }
  }

  // Default: allow.
  return { decision: 'allow', reason: '' }
}

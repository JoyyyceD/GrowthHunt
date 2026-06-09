/**
 * Pre-launch GEO pass — gate-less workflow (playbook-class). Landing audit +
 * GEO audit on the same URL. v1 stops short of opening a PR (that needs a
 * GitHub PAT, which is user-supplied per-call). Surfaces the action with a link.
 */
import type { Workflow } from './types'
import { tracedLanding, tracedGeoAudit } from '@/lib/orchestrator/agents'

export const pre_launch_geo_pass: Workflow = {
  id: 'pre_launch_geo_pass',
  name: 'Pre-launch GEO pass',
  description: 'Conversion audit + AI-citation audit on the same URL. Hands you a unified fix list before you ship.',
  category: 'playbook',
  embodies: 'The "is this page ready to launch?" pre-flight check.',
  estimatedMinutes: 2,
  outcome: 'Unified conversion + GEO fix list for the URL',
  triggers: [{ kind: 'manual' }],
  steps: [
    {
      id: 'landing',
      kind: 'agent',
      agentKind: 'landing',
      label: 'Conversion audit',
      async run(ctx) {
        const url = String(ctx.inputs?.url || '').trim() || ctx.workspace.url
        const { result } = await tracedLanding(
          { workspace: ctx.workspace, url },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: result, summary: `Conversion: ${result.overall_score}/100` }
      },
    },
    {
      id: 'geo',
      kind: 'agent',
      agentKind: 'geo_audit',
      label: 'GEO audit (AI citations)',
      async run(ctx) {
        const url = String(ctx.inputs?.url || '').trim() || ctx.workspace.url
        const { result } = await tracedGeoAudit(url, {
          workspace_id: ctx.workspace.id,
          conversation_id: ctx.conversationId,
          parent_task_id: ctx.parentTaskId,
          triggered_by: 'playbook',
        })
        return { ok: true, output: { score: result.overall_score, grade: result.grade }, summary: `GEO: ${result.overall_score}/100` }
      },
    },
  ],
}

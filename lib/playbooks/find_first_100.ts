/**
 * Find first 100 customers — heavy playbook.
 * Stacks radar scan + creator outreach + distribution priming so the user
 * has a queue of opportunities by the end.
 */
import type { Playbook } from './types'
import { tracedRadar, tracedCreator, tracedDistribution } from '@/lib/orchestrator/agents'

export const find_first_100: Playbook = {
  id: 'find_first_100',
  name: 'Find first 100',
  description: 'Radar scan for ICP-matching posts + 8 creator DMs + one ready-to-ship multi-channel launch — your morning queue.',
  estimatedMinutes: 6,
  steps: [
    {
      id: 'radar',
      kind: 'radar',
      label: 'Scan Reddit + HN',
      async run(ctx) {
        const { result } = await tracedRadar(
          { workspace: ctx.workspace },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: { inserted: result.inserted, scanned: result.scanned }, summary: `${result.inserted} leads` }
      },
    },
    {
      id: 'creator',
      kind: 'creator_outreach',
      label: 'Draft 8 creator DMs',
      async run(ctx) {
        const { result } = await tracedCreator(
          { workspace: ctx.workspace, picks: 8 },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: { count: result.drafts.length }, summary: `${result.drafts.length} DMs` }
      },
    },
    {
      id: 'distribution',
      kind: 'distribution',
      label: 'Draft a multi-channel launch post',
      async run(ctx) {
        const ws = ctx.workspace
        const topic = ws.one_liner
          || `${ws.name} — ${ws.positioning?.slice(0, 100) || 'a new tool for ' + (ws.icp_summary?.slice(0, 60) || 'indie founders')}`
        const { result } = await tracedDistribution(
          { workspace: ws, topic, sourceUrl: ws.url },
          { workspace_id: ws.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: !!result.post, output: { variants: Object.keys(result.post?.variants ?? {}).length }, summary: `${Object.keys(result.post?.variants ?? {}).length} variants` }
      },
    },
  ],
}

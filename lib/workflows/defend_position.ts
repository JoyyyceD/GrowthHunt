/**
 * Defend market position — react fast when competitors move.
 * Trigger: manual (later: event from competitor_diffs insert).
 */
import type { Workflow, WorkflowContext } from './types'
import { tracedCompetitor, tracedDistribution } from '@/lib/orchestrator/agents'
import { listDiffs } from '@/lib/agents/competitor'

export const defend_position: Workflow = {
  id: 'defend_position',
  name: 'Defend market position',
  description: 'Scan competitor moves, you pick the most threatening, we draft a counter-content campaign + A/B URL.',
  embodies: 'Competitor ships pricing change or new feature → you respond within 48h.',
  estimatedMinutes: 6,
  outcome: 'Counter-content campaign drafted within hours of competitor move',
  triggers: [
    { kind: 'manual', note: 'When a competitor moves' },
    { kind: 'event', event: 'competitor_diff', note: '(future) fires on competitor_diffs INSERT' },
  ],
  steps: [
    {
      id: 'scan',
      kind: 'agent',
      label: 'Fresh competitor scan',
      async run(ctx: WorkflowContext) {
        const { result } = await tracedCompetitor(
          { workspace: ctx.workspace, diff: true },
          { workspace_id: ctx.workspace.id, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: { snapshots: result.snapshots, diffs: result.diffs }, summary: `${result.snapshots} snap, ${result.diffs} change(s)` }
      },
    },
    {
      id: 'pick_diff',
      kind: 'gate',
      label: 'Pick the diff to respond to',
      async run(ctx: WorkflowContext) {
        if (ctx.resumeData) {
          const r = ctx.resumeData as { angle?: string }
          if (!r.angle?.trim()) return { ok: false, error: 'Provide an angle to respond' }
          return { ok: true, output: { angle: r.angle.trim() }, summary: `Angle: ${r.angle.slice(0, 80)}` }
        }
        const diffs = await listDiffs(ctx.workspace.id)
        return { ok: true, pause: { reason: 'pick_diff', payload: { recent_diffs: diffs.slice(0, 8) } } }
      },
    },
    {
      id: 'counter_distribution',
      kind: 'agent',
      label: 'Draft counter-content across platforms',
      async run(ctx: WorkflowContext) {
        const angle = (ctx.priorOutputs.pick_diff as { angle: string }).angle
        const { result } = await tracedDistribution(
          { workspace: ctx.workspace, topic: angle, sourceUrl: ctx.workspace.url },
          { workspace_id: ctx.workspace.id, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        const platformCount = Object.keys(result.post?.variants ?? {}).length
        return {
          ok: true,
          output: { post_id: result.post?.id, platforms: platformCount },
          summary: `${platformCount} counter-content variants`,
          artifact: { kind: 'campaign', ref: result.post?.id, url: `/agents/distribution?ws=${ctx.workspace.id}`, title: `Counter: ${angle.slice(0, 60)}` },
        }
      },
    },
  ],
}

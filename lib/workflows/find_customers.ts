/**
 * Find customers workflow — daily prospecting ritual.
 * Trigger: manual or weekly cron.
 * Real ritual: founder's "I need more leads this week" panic loop.
 */
import type { Workflow, WorkflowContext } from './types'
import { tracedRadar, tracedCreator } from '@/lib/orchestrator/agents'
import { listLeads } from '@/lib/agents/radar'

export const find_customers: Workflow = {
  id: 'find_customers',
  name: 'Find customers',
  description: 'Reddit/HN radar scan + 8 creator DMs + you pick top 5 leads to action.',
  embodies: 'Weekly prospecting: scan for ICP-match conversations + amplifier creators in one pass.',
  estimatedMinutes: 7,
  outcome: 'Pipeline: 5 high-intent leads + 8 creators primed',
  triggers: [
    { kind: 'manual', note: 'When you need pipeline' },
    { kind: 'cron', cron: '0 13 * * 1', note: 'Monday 13:00 UTC weekly' },
  ],
  steps: [
    {
      id: 'radar',
      kind: 'agent',
      label: 'Radar scan (Reddit + HN)',
      async run(ctx: WorkflowContext) {
        const { result } = await tracedRadar(
          { workspace: ctx.workspace },
          { workspace_id: ctx.workspace.id, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return {
          ok: true,
          output: { inserted: result.inserted, scanned: result.scanned },
          summary: `${result.inserted} new leads`,
          artifact: { kind: 'leads_list', url: `/agents/radar?ws=${ctx.workspace.id}`, title: `${result.inserted} Reddit/HN leads` },
        }
      },
    },
    {
      id: 'creators',
      kind: 'agent',
      label: 'Draft 8 creator amplifier DMs',
      async run(ctx: WorkflowContext) {
        const { result } = await tracedCreator(
          { workspace: ctx.workspace, picks: 8 },
          { workspace_id: ctx.workspace.id, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return {
          ok: true,
          output: { count: result.drafts.length },
          summary: `${result.drafts.length} DMs drafted`,
          artifact: { kind: 'leads_list', url: `/agents/creator?ws=${ctx.workspace.id}`, title: `${result.drafts.length} creators to DM` },
        }
      },
    },
    {
      id: 'pick_top_leads',
      kind: 'gate',
      label: 'Pick the top 5 radar leads to action now',
      async run(ctx: WorkflowContext) {
        if (ctx.resumeData) {
          return { ok: true, output: ctx.resumeData, summary: 'Top leads selected' }
        }
        const leads = await listLeads(ctx.workspace.id, { minRelevance: 60 })
        return {
          ok: true,
          pause: { reason: 'pick_top_leads', payload: { leads: leads.slice(0, 10) } },
        }
      },
    },
  ],
}

/**
 * Launch post playbook — user says "launch this thing", we:
 *   1. Distribution: produce 7 platform variants of the topic
 *   2. Creator outreach: 6 X DM drafts related to the topic
 *   3. A/B Lab: stand up an A/B test on the source_url with 2 hero variants
 *      (uses the X variant + the LinkedIn one-liner, since they fight hardest)
 */
import type { Playbook } from './types'
import { tracedDistribution, tracedCreator, tracedAbCreate } from '@/lib/orchestrator/agents'

export const launch_post: Playbook = {
  id: 'launch_post',
  name: 'Launch post',
  description: 'Generate multi-channel post variants, draft creator DMs related to the topic, and stand up an A/B test on the landing URL — all in one shot.',
  estimatedMinutes: 4,
  steps: [
    {
      id: 'distribution',
      kind: 'distribution',
      label: 'Generate platform variants',
      async run(ctx) {
        const topic = String(ctx.params?.topic || '').trim()
        if (!topic) return { ok: false, error: 'launch_post requires params.topic' }
        const sourceUrl = String(ctx.params?.source_url || '').trim() || ctx.workspace.url
        const { result } = await tracedDistribution(
          { workspace: ctx.workspace, topic, sourceUrl },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: !!result.post, output: result.post, summary: `${Object.keys(result.post?.variants ?? {}).length} variants` }
      },
    },
    {
      id: 'creator',
      kind: 'creator_outreach',
      label: 'Draft creator DMs',
      async run(ctx) {
        const topic = String(ctx.params?.topic || '').trim()
        const { result } = await tracedCreator(
          { workspace: ctx.workspace, picks: 6, notes: topic ? `Related to: ${topic}` : undefined },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: { count: result.drafts.length }, summary: `${result.drafts.length} DMs drafted` }
      },
    },
    {
      id: 'ab',
      kind: 'ab',
      label: 'Stand up A/B test on the source URL',
      async run(ctx) {
        const topic = String(ctx.params?.topic || '').trim()
        const sourceUrl = String(ctx.params?.source_url || '').trim() || ctx.workspace.url
        // Derive two short copies from distribution output
        const dist = ctx.priorOutputs.distribution as { variants?: { x?: { body?: string; threadParts?: string[] }; linkedin?: { body?: string } } } | undefined
        const xHook = dist?.variants?.x?.threadParts?.[0] || dist?.variants?.x?.body || `Check out ${topic || 'our latest'}`
        const linkedinHook = dist?.variants?.linkedin?.body?.split('\n')[0] || `${ctx.workspace.name}: ${topic || 'new launch'}`
        const copies = [xHook.slice(0, 160), linkedinHook.slice(0, 160)]
        const { result } = await tracedAbCreate(
          {
            workspaceId: ctx.workspace.id,
            name: `Launch: ${(topic || 'untitled').slice(0, 60)}`,
            targetUrl: sourceUrl,
            copies,
          },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        if ('error' in (result as Record<string, unknown>)) {
          return { ok: false, error: (result as { error: string }).error }
        }
        return { ok: true, output: result, summary: 'A/B test live' }
      },
    },
  ],
}

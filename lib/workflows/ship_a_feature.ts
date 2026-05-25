/**
 * Ship a feature workflow.
 *
 * Trigger: manual (later: GitHub release webhook event).
 * Real ritual: PR merges → "now I need to tell the world" → usually nothing happens.
 *
 * Steps:
 *   1. GATE — confirm/edit the release note (user-supplied topic + URL)
 *   2. Distribution agent → 7 platform variants
 *   3. Creator outreach → 6 DMs related to this topic
 *   4. A/B Lab → 2-variant tracked URL test
 *   5. EXTERNAL — open X compose with the X variant
 *
 * Outcome: feature is in 7 channels + 6 creators primed + click-tracked.
 */
import type { Workflow, WorkflowContext } from './types'
import { tracedDistribution, tracedCreator, tracedAbCreate } from '@/lib/orchestrator/agents'

export const ship_a_feature: Workflow = {
  id: 'ship_a_feature',
  name: 'Ship a feature',
  description: 'Take a release note → multi-channel distribution + 6 creator DMs + tracked A/B URL. Done in ~5 min.',
  embodies: 'PR-merges-to-main moment: avoid the "I shipped something and nobody knows" trap.',
  estimatedMinutes: 5,
  outcome: 'Feature distributed across 7 platforms with tracked A/B + creator amplification primed',
  triggers: [
    { kind: 'manual', note: 'When a feature ships' },
    { kind: 'event', event: 'github_release', note: '(future) GitHub release webhook' },
  ],
  steps: [
    {
      id: 'confirm_topic',
      kind: 'gate',
      label: 'Confirm the topic & URL',
      async run(ctx: WorkflowContext) {
        if (ctx.resumeData) {
          const r = ctx.resumeData as { topic?: string; source_url?: string }
          if (!r.topic?.trim()) return { ok: false, error: 'topic required' }
          return { ok: true, output: { topic: r.topic.trim(), source_url: r.source_url?.trim() || ctx.workspace.url }, summary: `Topic: ${r.topic.trim().slice(0, 80)}` }
        }
        const seedTopic = (ctx.inputs.topic as string) || ''
        const seedUrl = (ctx.inputs.source_url as string) || ctx.workspace.url
        return { ok: true, pause: { reason: 'confirm_topic', payload: { topic: seedTopic, source_url: seedUrl } } }
      },
    },
    {
      id: 'distribution',
      kind: 'agent',
      label: 'Generate platform variants',
      async run(ctx: WorkflowContext) {
        const { topic, source_url } = ctx.priorOutputs.confirm_topic as { topic: string; source_url: string }
        const { result } = await tracedDistribution(
          { workspace: ctx.workspace, topic, sourceUrl: source_url },
          { workspace_id: ctx.workspace.id, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        if (!result.post) return { ok: false, error: 'No variants generated' }
        const platformCount = Object.keys(result.post.variants).length
        return {
          ok: true,
          output: { post_id: result.post.id, variants: result.post.variants },
          summary: `${platformCount} platform variants generated`,
          artifact: { kind: 'campaign', ref: result.post.id, url: `/agents/distribution?ws=${ctx.workspace.id}`, title: `Distribution: ${topic.slice(0, 60)}` },
        }
      },
    },
    {
      id: 'creators',
      kind: 'agent',
      label: 'Draft 6 creator DMs about this feature',
      async run(ctx: WorkflowContext) {
        const topic = (ctx.priorOutputs.confirm_topic as { topic: string }).topic
        const { result } = await tracedCreator(
          { workspace: ctx.workspace, picks: 6, notes: `Related to launch: ${topic}` },
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
      id: 'ab',
      kind: 'agent',
      label: 'Stand up A/B tracked URLs',
      async run(ctx: WorkflowContext) {
        const { topic, source_url } = ctx.priorOutputs.confirm_topic as { topic: string; source_url: string }
        const variants = ctx.priorOutputs.distribution as { variants?: { x?: { body?: string; threadParts?: string[] }; linkedin?: { body?: string } } }
        const a = variants?.variants?.x?.threadParts?.[0] || variants?.variants?.x?.body || `Check out ${topic}`
        const b = variants?.variants?.linkedin?.body?.split('\n')[0] || `New: ${topic}`
        const { result } = await tracedAbCreate(
          { workspaceId: ctx.workspace.id, name: `Ship: ${topic.slice(0, 60)}`, targetUrl: source_url, copies: [a.slice(0, 160), b.slice(0, 160)] },
          { workspace_id: ctx.workspace.id, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        if ('error' in (result as Record<string, unknown>)) return { ok: false, error: (result as { error: string }).error }
        const test = result as { id: string }
        return {
          ok: true,
          output: { test_id: test.id },
          summary: 'A/B tracked URLs minted',
          artifact: { kind: 'campaign', ref: test.id, url: `/agents/ab?ws=${ctx.workspace.id}`, title: 'A/B test live' },
        }
      },
    },
    {
      id: 'open_compose',
      kind: 'external',
      label: 'Open X compose with the headline tweet',
      async run(ctx: WorkflowContext) {
        const variants = ctx.priorOutputs.distribution as { variants?: { x?: { body?: string; threadParts?: string[] } } }
        const text = variants?.variants?.x?.threadParts?.[0] || variants?.variants?.x?.body || ''
        if (!text) return { ok: true, summary: 'No X variant — workflow complete' }
        const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
        return {
          ok: true,
          summary: 'X compose ready',
          artifact: { kind: 'tweet', url, title: text.slice(0, 80) },
        }
      },
    },
  ],
}

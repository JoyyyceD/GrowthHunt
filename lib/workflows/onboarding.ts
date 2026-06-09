/**
 * Onboarding — gate-less workflow (playbook-class) that fires when a new
 * workspace is created. Goal: "blank workspace" → "ICP + voice + landing
 * baseline in 3 min".
 */
import type { Workflow } from './types'
import {
  tracedIcp, tracedVoice, tracedLanding,
} from '@/lib/orchestrator/agents'
import { patchWorkspace } from '@/lib/workspace/store'

export const onboarding: Workflow = {
  id: 'onboarding',
  name: 'Onboarding',
  description: 'Draft your ICP, train a voice profile (if a handle is set), and run a landing-page baseline — all in one pass. Auto-fires when a workspace is created.',
  category: 'playbook',
  embodies: 'First-run setup ritual for a brand-new workspace.',
  estimatedMinutes: 3,
  outcome: 'ICP + voice + landing baseline drafted',
  triggers: [{ kind: 'event', event: 'workspace_created' }],
  steps: [
    {
      id: 'icp',
      kind: 'agent',
      agentKind: 'icp',
      label: 'Draft ICP + positioning from your homepage',
      skipIf: (ws) => !!(ws.icp_summary && ws.positioning),
      async run(ctx) {
        const { result } = await tracedIcp(
          { workspace: ctx.workspace },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        // Persist to workspace
        await patchWorkspace(ctx.workspace.id, {
          icp_summary: result.icp_summary || ctx.workspace.icp_summary,
          icp_segments: result.icp_segments.length ? result.icp_segments : ctx.workspace.icp_segments,
          positioning: result.positioning || ctx.workspace.positioning,
          key_messages: result.key_messages.length ? result.key_messages : ctx.workspace.key_messages,
          competitors: result.competitors.length ? result.competitors : ctx.workspace.competitors,
        })
        return { ok: true, output: result, summary: result.positioning?.slice(0, 100) || 'ICP drafted' }
      },
    },
    {
      id: 'voice',
      kind: 'agent',
      agentKind: 'voice',
      label: 'Train voice profile (if handle set)',
      skipIf: (ws) => !ws.voice_handle || !!ws.voice,
      async run(ctx) {
        if (!ctx.workspace.voice_handle) return { ok: true, summary: 'Skipped: no voice_handle set' }
        const { result } = await tracedVoice(
          { handle: ctx.workspace.voice_handle, workspace: ctx.workspace },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        await patchWorkspace(ctx.workspace.id, { voice: result.voice })
        return { ok: true, output: result.voice, summary: result.voice.summary?.slice(0, 120) || 'Voice trained' }
      },
    },
    {
      id: 'landing',
      kind: 'agent',
      agentKind: 'landing',
      label: 'Baseline conversion audit of your URL',
      async run(ctx) {
        const { result } = await tracedLanding(
          { workspace: ctx.workspace, url: ctx.workspace.url },
          { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, parent_task_id: ctx.parentTaskId, triggered_by: 'playbook' },
        )
        return { ok: true, output: result, summary: `Landing baseline: ${result.overall_score}/100 (${result.grade})` }
      },
    },
  ],
}

/**
 * Playbook runner — compatibility shim.
 *
 * Playbooks were merged into the unified workflow runner. `runPlaybook` now
 * delegates to `startWorkflow` (the same engine the Workflows page uses) and
 * maps the result back to the original RunPlaybookOk shape so existing callers
 * keep working. Gate-less playbook-class workflows run straight through to
 * 'succeeded' / 'failed' — they never pause.
 */
import type { TaskTrigger } from '@/lib/orchestrator/types'
import type { Workspace } from '@/lib/workspace/types'
import { findWorkflow } from '@/lib/workflows/registry'
import { startWorkflow } from '@/lib/workflows/runner'

export interface RunPlaybookOpts {
  triggeredBy?: TaskTrigger
  conversationId?: string | null
  params?: Record<string, unknown>
}

export interface RunPlaybookOk {
  playbook: { id: string; name: string }
  parentTaskId: string
  summary: string
  steps: Array<{ id: string; ok: boolean; summary?: string; error?: string }>
}

export interface RunPlaybookErr { error: string }

export async function runPlaybook(playbookId: string, workspace: Workspace, opts: RunPlaybookOpts = {}): Promise<RunPlaybookOk | RunPlaybookErr> {
  const wf = findWorkflow(playbookId)
  if (!wf || (wf.category ?? 'process') !== 'playbook') return { error: `Unknown playbook: ${playbookId}` }

  const out = await startWorkflow(playbookId, workspace, {
    triggeredBy: opts.triggeredBy ?? 'manual_page',
    conversationId: opts.conversationId,
    inputs: opts.params ?? {},
  })
  if ('error' in out) return { error: out.error }

  const steps = out.stepLog.map((s) => ({
    id: s.step_id,
    ok: s.status === 'succeeded' || s.status === 'skipped',
    summary: s.summary,
    error: s.error,
  }))

  return {
    playbook: { id: wf.id, name: wf.name },
    parentTaskId: out.parentTaskId,
    summary: out.outcome ?? `${steps.length} step(s) completed.`,
    steps,
  }
}

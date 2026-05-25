/**
 * Playbook runner — synchronous v1.
 *
 * 1. Creates a parent gtm_tasks row (kind='playbook', status='running').
 * 2. Walks steps in order. Each step creates its own gtm_tasks child row
 *    via the tracedX() agents.
 * 3. Stores rolling step output in the parent row's output.steps_completed
 *    so timeouts can be resumed in v2.
 * 4. Marks parent succeeded/failed at the end.
 *
 * If any step throws, we record the failure and stop (no auto-retry in v1).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createTask, finishTask } from '@/lib/orchestrator/tasks'
import type { TaskTrigger } from '@/lib/orchestrator/types'
import type { Workspace } from '@/lib/workspace/types'
import { findPlaybook } from './registry'
import type { Playbook, PlaybookContext } from './types'

export interface RunPlaybookOpts {
  triggeredBy?: TaskTrigger
  conversationId?: string | null
  params?: Record<string, unknown>
}

export interface RunPlaybookOk {
  playbook: Playbook
  parentTaskId: string
  summary: string
  steps: Array<{ id: string; ok: boolean; summary?: string; error?: string }>
}

export interface RunPlaybookErr { error: string }

export async function runPlaybook(playbookId: string, workspace: Workspace, opts: RunPlaybookOpts = {}): Promise<RunPlaybookOk | RunPlaybookErr> {
  const pb = findPlaybook(playbookId)
  if (!pb) return { error: `Unknown playbook: ${playbookId}` }

  const parent = await createTask({
    kind: 'playbook',
    workspace_id: workspace.id,
    conversation_id: opts.conversationId,
    triggered_by: opts.triggeredBy ?? 'manual_page',
    input: { playbook_id: pb.id, params: opts.params ?? {} },
    summary: `Running ${pb.name}…`,
  })
  if (!parent) return { error: 'Could not record playbook parent task' }

  const startedAt = Date.now()
  const priorOutputs: Record<string, unknown> = {}
  const stepLog: RunPlaybookOk['steps'] = []
  let failureMsg: string | null = null

  for (const step of pb.steps) {
    if (step.skipIf && step.skipIf(workspace)) {
      stepLog.push({ id: step.id, ok: true, summary: 'skipped' })
      continue
    }
    const ctx: PlaybookContext = {
      workspace,
      parentTaskId: parent.id,
      conversationId: opts.conversationId ?? null,
      params: opts.params ?? {},
      priorOutputs,
    }
    let stepResult
    try {
      stepResult = await step.run(ctx)
    } catch (err) {
      stepResult = { ok: false, error: (err as Error).message }
    }
    stepLog.push({ id: step.id, ok: stepResult.ok, summary: stepResult.summary, error: stepResult.error })
    if (!stepResult.ok) {
      failureMsg = stepResult.error || `Step ${step.id} failed`
      break
    }
    priorOutputs[step.id] = stepResult.output
    // Snapshot rolling progress on parent (so resume is possible later).
    try {
      const admin = createAdminClient()
      await admin
        .from('gtm_tasks')
        .update({ output: { steps_completed: stepLog, prior_outputs_keys: Object.keys(priorOutputs) } })
        .eq('id', parent.id)
    } catch { /* noop */ }
  }

  const totalDuration = Date.now() - startedAt
  await finishTask(parent.id, {
    status: failureMsg ? 'failed' : 'succeeded',
    error: failureMsg ?? undefined,
    output: { steps_completed: stepLog, prior_outputs_keys: Object.keys(priorOutputs) },
    summary: failureMsg
      ? `${pb.name} stopped: ${failureMsg}`
      : `${pb.name} done · ${stepLog.length} step(s)`,
    duration_ms: totalDuration,
  })

  return {
    playbook: pb,
    parentTaskId: parent.id,
    summary: failureMsg
      ? `Stopped at step "${stepLog[stepLog.length - 1]?.id}". ${failureMsg}`
      : `${stepLog.length} step(s) completed.`,
    steps: stepLog,
  }
}

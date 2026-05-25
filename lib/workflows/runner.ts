/**
 * Workflow runner — pause-on-gate, resume-with-data semantics.
 *
 * One workflow_run row is created at start; status transitions:
 *   pending → running → awaiting_input → running → succeeded | failed
 *
 * When a step.run() returns `pause`, we:
 *   - persist the run with status='awaiting_input' + pause_reason + pause_payload
 *   - return — the request handler responds immediately
 *   - the user resumes via /api/gtm/workflows/[runId]/resume with their gate response
 *   - we re-load the run, attach resumeData to ctx, re-run the SAME step
 *   - if step returns ok this time, advance
 *
 * If the runner crashes mid-step, the workflow_run stays in 'running'; the
 * step-advancer cron (future v2) picks it up.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createTask, finishTask } from '@/lib/orchestrator/tasks'
import type { TaskTrigger } from '@/lib/orchestrator/types'
import type { Workspace } from '@/lib/workspace/types'
import { findWorkflow } from './registry'
import type { Workflow, WorkflowArtifact, WorkflowContext, WorkflowStepResult } from './types'

interface StepLogEntry {
  step_id: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'paused'
  summary?: string
  error?: string
  artifact?: WorkflowArtifact
  ran_at?: string
}

export interface StartWorkflowOpts {
  triggeredBy?: TaskTrigger
  inputs?: Record<string, unknown>
}

export interface StartWorkflowOk {
  runId: string
  status: 'succeeded' | 'failed' | 'awaiting_input' | 'running'
  pauseReason?: string
  pausePayload?: unknown
  artifacts: WorkflowArtifact[]
  outcome?: string
  stepLog: StepLogEntry[]
}
export type StartWorkflowResult = StartWorkflowOk | { error: string }

async function patch(runId: string, patch: Record<string, unknown>): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('workflow_runs').update(patch).eq('id', runId)
  } catch (err) {
    console.error('[wf] patch failed:', (err as Error).message)
  }
}

async function loadRun(runId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('workflow_runs').select('*').eq('id', runId).maybeSingle()
  return data
}

async function execLoop(
  wf: Workflow,
  workspace: Workspace,
  runId: string,
  parentTaskId: string,
  triggeredBy: TaskTrigger,
  inputs: Record<string, unknown>,
  startStep: number,
  priorOutputs: Record<string, unknown>,
  stepLog: StepLogEntry[],
  artifacts: WorkflowArtifact[],
  resumeData?: unknown,
): Promise<StartWorkflowOk> {
  let failureMsg: string | null = null
  let pausedAt: { reason: string; payload?: unknown } | null = null
  const total = wf.steps.length

  for (let i = startStep; i < total; i++) {
    const step = wf.steps[i]!
    if (step.skipIf && step.skipIf(workspace, priorOutputs)) {
      stepLog.push({ step_id: step.id, status: 'skipped', ran_at: new Date().toISOString(), summary: 'skipped' })
      continue
    }
    stepLog.push({ step_id: step.id, status: 'running', ran_at: new Date().toISOString() })
    await patch(runId, { current_step: i, step_log: stepLog })

    const ctx: WorkflowContext = {
      workspace,
      workflowRunId: runId,
      parentTaskId,
      triggeredBy,
      inputs,
      priorOutputs,
      // resumeData is only present on the very first step we encounter after a resume
      resumeData: i === startStep ? resumeData : undefined,
    }
    let res: WorkflowStepResult
    try { res = await step.run(ctx) } catch (err) { res = { ok: false, error: (err as Error).message } }

    const last = stepLog[stepLog.length - 1]!
    if (!res.ok) {
      last.status = 'failed'; last.error = res.error
      failureMsg = `${step.id}: ${res.error}`
      break
    }
    if (res.pause) {
      last.status = 'paused'
      last.summary = res.summary || `paused: ${res.pause.reason}`
      pausedAt = { reason: res.pause.reason, payload: res.pause.payload }
      // Do NOT advance current_step — resume restarts this step
      break
    }
    last.status = 'succeeded'
    last.summary = res.summary
    if (res.artifact) {
      last.artifact = res.artifact
      artifacts.push(res.artifact)
    }
    priorOutputs[step.id] = res.output
    await patch(runId, { step_log: stepLog, outputs: priorOutputs, artifacts })
  }

  if (failureMsg) {
    await finishTask(parentTaskId, { status: 'failed', error: failureMsg, output: { stepLog, artifacts } })
    await patch(runId, {
      status: 'failed', current_step: stepLog.length - 1,
      step_log: stepLog, artifacts, finished_at: new Date().toISOString(),
      outcome: `Stopped: ${failureMsg}`,
    })
    return { runId, status: 'failed', artifacts, outcome: `Stopped: ${failureMsg}`, stepLog }
  }
  if (pausedAt) {
    await patch(runId, {
      status: 'awaiting_input', current_step: stepLog.length - 1,
      step_log: stepLog, artifacts,
      pause_reason: pausedAt.reason, pause_payload: pausedAt.payload ?? null,
    })
    return { runId, status: 'awaiting_input', artifacts, pauseReason: pausedAt.reason, pausePayload: pausedAt.payload, stepLog }
  }
  const outcome = `${wf.outcome} · ${stepLog.length} step(s)`
  await finishTask(parentTaskId, { status: 'succeeded', output: { stepLog, artifacts }, summary: outcome })
  await patch(runId, {
    status: 'succeeded', current_step: stepLog.length - 1,
    step_log: stepLog, artifacts, outputs: priorOutputs,
    finished_at: new Date().toISOString(), outcome,
  })
  return { runId, status: 'succeeded', artifacts, outcome, stepLog }
}

export async function startWorkflow(workflowId: string, workspace: Workspace, opts: StartWorkflowOpts = {}): Promise<StartWorkflowResult> {
  const wf = findWorkflow(workflowId)
  if (!wf) return { error: `Unknown workflow: ${workflowId}` }

  const parent = await createTask({
    kind: 'playbook',  // reuses gtm_tasks taxonomy; UI distinguishes via workflow_run linkage
    workspace_id: workspace.id,
    triggered_by: opts.triggeredBy ?? 'manual_page',
    input: { workflow_id: wf.id, inputs: opts.inputs ?? {} },
    summary: `Workflow: ${wf.name}`,
  })
  if (!parent) return { error: 'Could not create parent task' }

  const admin = createAdminClient()
  const { data: runRow, error } = await admin
    .from('workflow_runs')
    .insert({
      workspace_id: workspace.id,
      workflow_id: wf.id,
      parent_task_id: parent.id,
      status: 'running',
      trigger_kind: opts.triggeredBy ?? 'manual',
      total_steps: wf.steps.length,
      inputs: opts.inputs ?? {},
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error || !runRow) return { error: `Could not create workflow_run: ${error?.message}` }

  return await execLoop(
    wf, workspace, runRow.id as string, parent.id, opts.triggeredBy ?? 'manual_page',
    opts.inputs ?? {}, 0, {}, [], [],
  )
}

export async function resumeWorkflow(runId: string, resumeData: unknown): Promise<StartWorkflowResult> {
  const row = await loadRun(runId)
  if (!row) return { error: 'Workflow run not found' }
  if (row.status !== 'awaiting_input') return { error: `Run is ${row.status}, not awaiting input` }
  const wf = findWorkflow(row.workflow_id as string)
  if (!wf) return { error: 'Workflow definition missing' }

  // Re-fetch workspace
  const admin = createAdminClient()
  const { data: ws } = await admin.from('gtm_workspaces').select('*').eq('id', row.workspace_id).maybeSingle()
  if (!ws) return { error: 'Workspace not found' }

  // Pop the paused step entry — execLoop will re-add it
  const log: StepLogEntry[] = ((row.step_log as StepLogEntry[]) || []).filter((l, i, arr) => !(i === arr.length - 1 && l.status === 'paused'))
  await patch(runId, { status: 'running', pause_reason: null, pause_payload: null, step_log: log })

  return await execLoop(
    wf, ws as Workspace, runId, row.parent_task_id as string,
    (row.trigger_kind as TaskTrigger) || 'manual_page',
    (row.inputs as Record<string, unknown>) ?? {},
    row.current_step as number,
    (row.outputs as Record<string, unknown>) ?? {},
    log,
    (row.artifacts as WorkflowArtifact[]) ?? [],
    resumeData,
  )
}

export async function getWorkflowRun(runId: string) {
  return loadRun(runId)
}

export async function listWorkflowRuns(workspaceId: string, limit = 30) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('workflow_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

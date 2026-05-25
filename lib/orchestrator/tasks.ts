/**
 * Task ledger — every agent / playbook / chat-turn invocation writes here.
 *
 * recordTask() is the universal adapter: it wraps an async agent function so
 * the row is created at start, updated at finish, with no caller change to
 * the returned value. Existing agent modules can opt in by replacing
 *
 *   const result = await runIcpAgent(input)
 *
 * with
 *
 *   const { result } = await recordTask({ kind: 'icp', workspace_id, ... }, () => runIcpAgent(input))
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { GtmTask, TaskKind, TaskStatus, TaskTrigger } from './types'

export interface RecordTaskOpts<T> {
  kind: TaskKind
  workspace_id?: string | null
  conversation_id?: string | null
  parent_task_id?: string | null
  triggered_by?: TaskTrigger
  input?: Record<string, unknown>
  /** Short user-facing description; renderer falls back to kind if absent. */
  summary?: string
  /** Builds a summary from the result; called after fn() resolves. */
  summaryFromResult?: (result: T) => string
}

export interface RecordedTask<T> {
  task: GtmTask
  result: T
}

function hydrate(row: Record<string, unknown>): GtmTask {
  return {
    id: row.id as string,
    workspace_id: (row.workspace_id as string | null) ?? null,
    conversation_id: (row.conversation_id as string | null) ?? null,
    parent_task_id: (row.parent_task_id as string | null) ?? null,
    kind: row.kind as TaskKind,
    status: row.status as TaskStatus,
    triggered_by: row.triggered_by as TaskTrigger,
    input: (row.input as Record<string, unknown>) ?? {},
    output: row.output,
    summary: (row.summary as string | null) ?? null,
    error: (row.error as string | null) ?? null,
    duration_ms: (row.duration_ms as number | null) ?? null,
    scheduled_for: (row.scheduled_for as string | null) ?? null,
    started_at: (row.started_at as string | null) ?? null,
    finished_at: (row.finished_at as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

/** Insert a pending/running task row; returns hydrated GtmTask. */
export async function createTask(opts: Omit<RecordTaskOpts<unknown>, 'summaryFromResult'>): Promise<GtmTask | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('gtm_tasks')
      .insert({
        kind: opts.kind,
        workspace_id: opts.workspace_id ?? null,
        conversation_id: opts.conversation_id ?? null,
        parent_task_id: opts.parent_task_id ?? null,
        triggered_by: opts.triggered_by ?? 'manual_page',
        input: opts.input ?? {},
        summary: opts.summary ?? null,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[orch] createTask failed:', error?.message)
      return null
    }
    return hydrate(data)
  } catch (err) {
    console.error('[orch] createTask threw:', (err as Error).message)
    return null
  }
}

export async function finishTask(
  id: string,
  patch: { status: TaskStatus; output?: unknown; error?: string; summary?: string; duration_ms?: number },
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin
      .from('gtm_tasks')
      .update({
        status: patch.status,
        output: patch.output ?? null,
        error: patch.error ?? null,
        summary: patch.summary ?? undefined,
        duration_ms: patch.duration_ms ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq('id', id)
  } catch (err) {
    console.error('[orch] finishTask threw:', (err as Error).message)
  }
}

/**
 * Run fn() inside a task row. Soft-fails — if recording dies, fn still runs.
 *
 * The task (or null when the insert failed) is passed into fn so callers that
 * spawn sub-tasks can use `task.id` as parent_task_id without a second round
 * trip. Existing callers using `() => runAgent(input)` still type-check.
 */
export async function recordTask<T>(
  opts: RecordTaskOpts<T>,
  fn: (task: GtmTask | null) => Promise<T>,
): Promise<RecordedTask<T>> {
  const startedAt = Date.now()
  const task = await createTask(opts)
  try {
    const result = await fn(task)
    const summary = opts.summaryFromResult ? opts.summaryFromResult(result) : opts.summary
    if (task) {
      await finishTask(task.id, {
        status: 'succeeded',
        output: result,
        summary,
        duration_ms: Date.now() - startedAt,
      })
    }
    return { task: task ?? ({ id: '', kind: opts.kind } as unknown as GtmTask), result }
  } catch (err) {
    if (task) {
      await finishTask(task.id, {
        status: 'failed',
        error: (err as Error).message,
        duration_ms: Date.now() - startedAt,
      })
    }
    throw err
  }
}

export interface ListTasksOpts {
  workspaceId: string
  kinds?: TaskKind[]
  limit?: number
}

export async function listRecentTasks(opts: ListTasksOpts): Promise<GtmTask[]> {
  try {
    const admin = createAdminClient()
    let q = admin
      .from('gtm_tasks')
      .select('*')
      .eq('workspace_id', opts.workspaceId)
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? 20)
    if (opts.kinds && opts.kinds.length > 0) q = q.in('kind', opts.kinds)
    const { data, error } = await q
    if (error) return []
    return (data || []).map((d) => hydrate(d))
  } catch (err) {
    console.error('[orch] listRecentTasks:', (err as Error).message)
    return []
  }
}

export async function getTask(id: string): Promise<GtmTask | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('gtm_tasks').select('*').eq('id', id).maybeSingle()
    return data ? hydrate(data) : null
  } catch { return null }
}

export async function getChildTasks(parentId: string): Promise<GtmTask[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gtm_tasks')
      .select('*')
      .eq('parent_task_id', parentId)
      .order('created_at', { ascending: true })
    return (data || []).map((d) => hydrate(d))
  } catch { return [] }
}

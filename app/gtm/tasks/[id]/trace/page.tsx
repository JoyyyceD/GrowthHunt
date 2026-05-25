/**
 * /gtm/tasks/[id]/trace — full ReAct loop timeline for a chat_turn task.
 *
 * Reads agent_steps via service role (RLS-enabled, no user policies) after
 * verifying the user owns the workspace that produced the task.
 */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspace } from '@/lib/workspace/store'
import { getTask } from '@/lib/orchestrator/tasks'

interface AgentStepRow {
  id: string
  step_index: number
  thought: string | null
  action_kind: string
  tool_name: string | null
  tool_params: unknown
  observation: string | null
  task_id: string | null
  duration_ms: number | null
  created_at: string
}

function actionBadgeColor(kind: string): string {
  if (kind === 'tool_call') return '#16a34a'
  if (kind === 'final_answer') return 'var(--accent)'
  if (kind === 'approval_request') return 'var(--warn)'
  if (kind === 'error') return '#c0392b'
  return 'var(--ink-faint)'
}

function safeJson(v: unknown): string {
  if (v == null) return ''
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

export default async function TraceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/gtm/tasks/${id}/trace`)
  const task = await getTask(id)
  if (!task) notFound()
  if (task.workspace_id) {
    const ws = await getWorkspace(task.workspace_id)
    if (!ws || (ws.owner_id && ws.owner_id !== user.id)) redirect('/gtm')
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('agent_steps')
    .select('id, step_index, thought, action_kind, tool_name, tool_params, observation, task_id, duration_ms, created_at')
    .eq('turn_task_id', id)
    .order('step_index', { ascending: true })

  const steps: AgentStepRow[] = (data ?? []) as AgentStepRow[]

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '32px 0 64px' }}>
        <div className="shell" style={{ maxWidth: 880 }}>
          <Link href={`/gtm/tasks/${id}`} style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>← Task detail</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'var(--bg-card)', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{task.kind}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{new Date(task.created_at).toISOString().slice(0, 19).replace('T', ' ')}</span>
            {task.duration_ms != null && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>· {task.duration_ms}ms total</span>}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            ReAct trace
          </h1>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 22 }}>
            {task.summary || `${task.kind} task`} · {steps.length} step{steps.length === 1 ? '' : 's'}
          </div>

          {steps.length === 0 ? (
            <div style={{ padding: '28px 20px', border: '1px dashed var(--rule-strong)', borderRadius: 12, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
              No agent_steps recorded for this task. (Was it a chat_turn?)
            </div>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map((s) => (
                <li key={s.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', minWidth: 28 }}>#{s.step_index}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, padding: '2px 7px', borderRadius: 4, background: actionBadgeColor(s.action_kind), color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.action_kind}</span>
                    {s.tool_name && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>{s.tool_name}</span>
                    )}
                    <span style={{ flex: 1 }} />
                    {s.duration_ms != null && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{s.duration_ms}ms</span>
                    )}
                    {s.task_id && (
                      <Link href={`/gtm/tasks/${s.task_id}`} style={{ fontSize: 11.5, color: 'var(--accent)' }}>linked task →</Link>
                    )}
                  </div>
                  {s.thought && (
                    <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 8, lineHeight: 1.5 }}>
                      <span style={{ marginRight: 4 }}>🧠</span>{s.thought}
                    </div>
                  )}
                  {s.observation && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 12px', marginBottom: s.tool_params ? 8 : 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                      {s.observation}
                    </div>
                  )}
                  {s.tool_params != null && safeJson(s.tool_params) && safeJson(s.tool_params) !== '{}' && (
                    <details>
                      <summary style={{ cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', userSelect: 'none' }}>
                        params
                      </summary>
                      <pre style={{ margin: '6px 0 0', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ink-dim)', maxHeight: 220, overflow: 'auto' }}>{safeJson(s.tool_params)}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}

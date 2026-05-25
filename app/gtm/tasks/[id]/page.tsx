import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getTask, getChildTasks } from '@/lib/orchestrator/tasks'

function statusColor(s: string): string {
  if (s === 'succeeded') return '#16a34a'
  if (s === 'failed') return '#c0392b'
  if (s === 'running') return 'var(--warn)'
  return 'var(--ink-faint)'
}

function safeJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/gtm/tasks/${id}`)
  const task = await getTask(id)
  if (!task) notFound()
  if (task.workspace_id) {
    const ws = await getWorkspace(task.workspace_id)
    if (!ws || (ws.owner_id && ws.owner_id !== user.id)) redirect('/gtm')
  }
  const children = await getChildTasks(id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '32px 0 64px' }}>
        <div className="shell" style={{ maxWidth: 880 }}>
          <Link href="/gtm" style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>← Mission control</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'var(--bg-card)', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{task.kind}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 8px', borderRadius: 4, background: statusColor(task.status), color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{task.status}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{new Date(task.created_at).toISOString().slice(0, 19).replace('T', ' ')}</span>
            {task.duration_ms != null && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>· {task.duration_ms}ms</span>}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            {task.summary || `${task.kind} task`}
          </h1>
          {task.error && (
            <div style={{ padding: '12px 16px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, fontSize: 13, color: '#c0392b', marginBottom: 16 }}>
              {task.error}
            </div>
          )}

          {children.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Steps ({children.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {children.map((c) => (
                  <Link key={c.id} href={`/gtm/tasks/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--bg-elev)', textDecoration: 'none' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#fff', background: statusColor(c.status), borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.status}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-dim)', minWidth: 90 }}>{c.kind}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{c.summary || c.kind}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>{c.duration_ms != null ? `${c.duration_ms}ms` : ''}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 16px', background: 'var(--bg-elev)' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Input</div>
              <pre style={{ margin: 0, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ink-dim)', maxHeight: 320, overflow: 'auto' }}>{safeJson(task.input)}</pre>
            </div>
            <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 16px', background: 'var(--bg-elev)' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Output</div>
              <pre style={{ margin: 0, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ink-dim)', maxHeight: 320, overflow: 'auto' }}>{safeJson(task.output)}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

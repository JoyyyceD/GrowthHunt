'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface WfMeta {
  id: string
  name: string
  description: string
  embodies: string
  estimatedMinutes: number
  outcome: string
  triggers: Array<{ kind: string; cron?: string; event?: string; note?: string }>
}

interface RunRow {
  id: string
  workflow_id: string
  status: string
  pause_reason?: string | null
  outcome?: string | null
  artifacts?: Array<{ kind: string; title?: string; url?: string }>
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: '#16a34a', awaiting_input: 'var(--warn)', running: '#3b82f6',
  failed: '#c0392b', cancelled: 'var(--ink-faint)', pending: 'var(--ink-faint)',
}

export function WorkflowList({ workspaceId, workflows, runs }: { workspaceId: string; workflows: WfMeta[]; runs: RunRow[] }) {
  const router = useRouter()
  const [starting, setStarting] = useState<string | null>(null)

  async function start(wfId: string) {
    setStarting(wfId)
    try {
      const res = await fetch('/api/gtm/workflows', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, workflow_id: wfId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { toast.error(data.error || 'Start failed'); return }
      if (data.status === 'awaiting_input') {
        toast.success('Workflow paused for your input')
        router.push(`/gtm/workflows/${data.runId}`)
      } else {
        toast.success(`Workflow ${data.status}`)
        router.push(`/gtm/workflows/${data.runId}`)
      }
    } finally { setStarting(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Library</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {workflows.map((w) => (
            <div key={w.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, color: 'var(--ink)' }}>{w.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>~{w.estimatedMinutes}min</span>
                {w.triggers.map((t, i) => (
                  <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'var(--bg-card)', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t.kind}{t.cron ? ` ${t.cron}` : t.event ? ` ${t.event}` : ''}
                  </span>
                ))}
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.55 }}>{w.description}</p>
              <p style={{ margin: '0 0 6px', fontSize: 12.5, color: 'var(--ink-dim)', fontStyle: 'italic' }}>Embodies: {w.embodies}</p>
              <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--accent)' }}>Outcome → {w.outcome}</p>
              <button type="button" onClick={() => start(w.id)} disabled={starting === w.id} style={{ background: starting === w.id ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: starting === w.id ? 'not-allowed' : 'pointer' }}>
                {starting === w.id ? 'Starting…' : 'Run now →'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {runs.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Recent runs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runs.map((r) => (
              <Link key={r.id} href={`/gtm/workflows/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--bg-elev)', textDecoration: 'none', color: 'var(--ink)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#fff', background: STATUS_COLOR[r.status] || 'var(--ink-faint)', borderRadius: 3, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.status}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-dim)' }}>{r.workflow_id}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{r.outcome || r.pause_reason || ''}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{new Date(r.created_at).toISOString().slice(5, 16).replace('T', ' ')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

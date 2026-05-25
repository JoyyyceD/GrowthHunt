'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Workspace } from '@/lib/workspace/types'
import type { TrendCandidate } from '@/lib/agents/trend-digest'

type Phase = 'idle' | 'running' | 'done' | 'error'

function relColor(r: number): string {
  if (r >= 70) return '#16a34a'
  if (r >= 50) return 'var(--warn)'
  return '#c0392b'
}

export function TrendRunner({ workspace, initialCandidates }: { workspace: Workspace; initialCandidates: TrendCandidate[] }) {
  const [list, setList] = useState<TrendCandidate[]>(initialCandidates)
  const [phase, setPhase] = useState<Phase>('idle')
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')

  async function refresh() {
    setPhase('running'); setErr(''); setInfo('')
    try {
      const res = await fetch('/api/agents/trend-digest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Failed'); setPhase('error'); return }
      setInfo(`${data.inserted} new drafts (scanned ${data.scanned}). ${data.notes || ''}`)
      const fresh = await fetch(`/api/agents/trend-digest?workspace_id=${workspace.id}`)
      if (fresh.ok) {
        const j = await fresh.json()
        if (Array.isArray(j.candidates)) setList(j.candidates as TrendCandidate[])
      }
      toast.success('Digest refreshed')
      setPhase('done')
    } catch (e) { setErr((e as Error).message); setPhase('error') }
  }

  async function update(id: string, status: 'saved' | 'dismissed' | 'posted') {
    await fetch(`/api/agents/trend-digest/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  function openX(c: TrendCandidate) {
    const text = encodeURIComponent(c.drafted_post)
    const ref = encodeURIComponent(c.url)
    const url = `https://x.com/intent/tweet?text=${text}&url=${ref}`
    window.open(url, '_blank', 'noopener,noreferrer')
    void update(c.id, 'posted')
  }

  function copy(text: string) {
    try { navigator.clipboard.writeText(text); toast.success('Copied') } catch { /* noop */ }
  }

  const visible = list.filter((c) => c.status !== 'dismissed')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={refresh} disabled={phase === 'running'} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer' }}>
          {phase === 'running' ? 'Building digest…' : 'Refresh now →'}
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Auto-runs daily 08:00 UTC.</span>
      </div>
      {info && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-dim)' }}>{info}</p>}
      {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}

      {visible.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '32px 26px', textAlign: 'center', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>No candidates today. Click <strong>Refresh now</strong> to build one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((c) => (
            <div key={c.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 20px', background: 'var(--bg-elev)', opacity: c.status === 'posted' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', background: relColor(c.relevance), borderRadius: 4, padding: '3px 8px' }}>{c.relevance}</span>
                {c.source_handle && <a href={`https://x.com/${c.source_handle}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', textDecoration: 'none' }}>@{c.source_handle}</a>}
                {c.template_used && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', background: 'var(--bg-card)', borderRadius: 4, padding: '2px 7px' }}>{c.template_used}</span>}
                {c.status !== 'new' && <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 7px', borderRadius: 4, background: c.status === 'posted' ? 'rgba(22,163,74,0.15)' : 'var(--bg-card)', color: c.status === 'posted' ? '#16a34a' : 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.status}</span>}
              </div>
              <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-faint)', fontStyle: 'italic', textDecoration: 'none', borderLeft: '3px solid var(--rule-strong)', paddingLeft: 10, marginBottom: 12 }}>
                Source: &ldquo;{c.context_text.slice(0, 220)}{c.context_text.length > 220 ? '…' : ''}&rdquo; ↗
              </a>
              <pre style={{ margin: '0 0 10px', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)' }}>{c.drafted_post}</pre>
              {c.reasoning && <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>→ {c.reasoning}</p>}
              {c.status !== 'posted' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => openX(c)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Post on X →
                  </button>
                  <button type="button" onClick={() => copy(c.drafted_post)} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                    Copy
                  </button>
                  <button type="button" onClick={() => update(c.id, 'saved')} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                    Save
                  </button>
                  <button type="button" onClick={() => update(c.id, 'dismissed')} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

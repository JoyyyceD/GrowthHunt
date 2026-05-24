'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Workspace } from '@/lib/workspace/types'
import type { RadarLead } from '@/lib/agents/radar'

type Phase = 'idle' | 'running' | 'done' | 'error'

function relColor(r: number): string {
  if (r >= 80) return '#16a34a'
  if (r >= 60) return '#65a30d'
  if (r >= 40) return 'var(--warn)'
  return '#c0392b'
}
function relBg(r: number): string {
  if (r >= 80) return 'rgba(22,163,74,0.15)'
  if (r >= 60) return 'rgba(101,163,13,0.15)'
  if (r >= 40) return 'rgba(176,122,0,0.12)'
  return 'rgba(192,57,43,0.10)'
}

const SOURCE_LABEL: Record<string, string> = {
  reddit: 'Reddit',
  hackernews: 'HN',
}

export function RadarRunner({ workspace, allWorkspaces, initialLeads }: { workspace: Workspace; allWorkspaces: Workspace[]; initialLeads: RadarLead[] }) {
  const [leads, setLeads] = useState<RadarLead[]>(initialLeads)
  const [phase, setPhase] = useState<Phase>('idle')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [filter, setFilter] = useState<'all' | 'asking' | 'complaining' | 'comparing'>('all')

  async function run() {
    setPhase('running'); setErr(''); setInfo('')
    try {
      const res = await fetch('/api/agents/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, notes }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.notes || data.error || 'Run failed.'); setPhase('error'); return }
      setInfo(`${data.inserted} new leads (scanned ${data.scanned}, skipped ${data.duplicates} dupes). ${data.notes || ''}`)
      // refresh leads from server
      const list = await fetch(`/api/agents/radar?workspace_id=${workspace.id}`)
      if (list.ok) {
        const j = await list.json()
        if (Array.isArray(j.leads)) setLeads(j.leads as RadarLead[])
      }
      setPhase('done')
    } catch { setErr('Network error.'); setPhase('error') }
  }

  async function updateStatus(id: string, status: 'saved' | 'dismissed' | 'replied') {
    const res = await fetch(`/api/agents/radar/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, status } : l)))
  }

  async function copyReply(text: string) {
    try { await navigator.clipboard.writeText(text) } catch { /* noop */ }
  }

  const visible = leads.filter((l) => {
    if (l.status === 'dismissed') return false
    if (filter === 'all') return true
    return l.intent === filter
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/radar?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <Link href={`/workspace/${workspace.id}`} style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>tune signals →</Link>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Optional notes (steer the queries)</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. focus on people asking about Reddit growth, ignore generic startup advice threads"
          style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
        />
        <button type="button" onClick={run} disabled={phase === 'running'} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer', marginTop: 12 }}>
          {phase === 'running' ? 'Scanning…' : 'Scan now →'}
        </button>
        {info && phase === 'done' && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>{info}</p>}
        {phase === 'running' && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-dim)' }}>Deriving queries · pulling Reddit + HN (last 14d) · scoring relevance. 30-90 seconds.</p>}
        {err && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </div>

      {leads.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(['all', 'asking', 'complaining', 'comparing'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{ background: filter === f ? 'var(--ink)' : 'transparent', color: filter === f ? 'var(--bg)' : 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '32px 26px', textAlign: 'center', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>
            {leads.length === 0 ? 'No leads yet — run a scan above.' : 'No leads match this filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((l) => (
            <div key={l.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 20px', background: 'var(--bg-elev)', opacity: l.status === 'replied' ? 0.7 : 1 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: relColor(l.relevance), background: relBg(l.relevance), borderRadius: 4, padding: '3px 8px' }}>{l.relevance}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: '#fff', background: l.source === 'reddit' ? '#ff4500' : '#ff6600', borderRadius: 4, padding: '3px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {SOURCE_LABEL[l.source] || l.source}
                </span>
                {l.intent && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--ink-dim)', background: 'var(--bg-card)', borderRadius: 4, padding: '3px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l.intent}</span>
                )}
                {l.author && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>u/{l.author}</span>}
                {l.posted_at && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{new Date(l.posted_at).toISOString().slice(0, 10)}</span>}
                {l.status !== 'new' && (
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 7px', borderRadius: 4, background: 'var(--bg-card)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l.status}</span>
                )}
              </div>
              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', display: 'block', marginBottom: 6 }}>{l.title} ↗</a>
              {l.excerpt && <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{l.excerpt.slice(0, 280)}{l.excerpt.length > 280 ? '…' : ''}</p>}
              {l.reasoning && <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>→ {l.reasoning}</p>}
              {l.reply_draft && (
                <details style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suggested reply (your voice)</summary>
                  <pre style={{ margin: '8px 0 8px', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)' }}>{l.reply_draft}</pre>
                  <button type="button" onClick={() => copyReply(l.reply_draft || '')} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                    Copy
                  </button>
                </details>
              )}
              {l.status === 'new' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => updateStatus(l.id, 'replied')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Reply on {SOURCE_LABEL[l.source] || l.source} →
                  </a>
                  <button type="button" onClick={() => updateStatus(l.id, 'saved')} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                    Save
                  </button>
                  <button type="button" onClick={() => updateStatus(l.id, 'dismissed')} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
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

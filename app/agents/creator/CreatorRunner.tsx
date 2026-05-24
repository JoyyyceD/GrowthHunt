'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Workspace } from '@/lib/workspace/types'
import type { OutreachDraft } from '@/lib/agents/creator'

type Phase = 'idle' | 'running' | 'done' | 'error'

function scoreBg(s: number): string {
  if (s >= 75) return 'rgba(22,163,74,0.15)'
  if (s >= 55) return 'rgba(176,122,0,0.12)'
  return 'rgba(192,57,43,0.10)'
}
function scoreFg(s: number): string {
  if (s >= 75) return '#16a34a'
  if (s >= 55) return 'var(--warn)'
  return '#c0392b'
}

export function CreatorRunner({ workspace, allWorkspaces, initialDrafts }: { workspace: Workspace; allWorkspaces: Workspace[]; initialDrafts: OutreachDraft[] }) {
  const [drafts, setDrafts] = useState<OutreachDraft[]>(initialDrafts)
  const [phase, setPhase] = useState<Phase>('idle')
  const [picks, setPicks] = useState(12)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  async function run() {
    setPhase('running'); setErr(''); setInfo('')
    try {
      const res = await fetch('/api/agents/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, picks, notes }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.notes || data.error || 'Run failed.'); setPhase('error'); return }
      setDrafts(data.drafts || [])
      setInfo(data.notes || '')
      setPhase('done')
    } catch { setErr('Network error.'); setPhase('error') }
  }

  async function updateStatus(id: string, status: 'sent' | 'skipped' | 'replied') {
    const res = await fetch(`/api/agents/creator/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)))
  }

  function openXDm(d: OutreachDraft) {
    // X doesn't have a public pre-filled DM URL, but the messages compose page does.
    const text = encodeURIComponent(d.message_body)
    const url = `https://x.com/messages/compose?recipient_id=${encodeURIComponent(d.handle)}&text=${text}`
    window.open(url, '_blank', 'noopener,noreferrer')
    void updateStatus(d.id, 'sent')
  }

  const queued = drafts.filter((d) => !d.status || d.status === 'queued')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/creator?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <Link href={`/workspace/${workspace.id}`} style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>edit context →</Link>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '0 0 110px' }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Draft count</label>
            <input type="number" min={3} max={12} value={picks} onChange={(e) => setPicks(Math.min(12, Math.max(3, Number(e.target.value) || 12)))} style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--ink)' }} />
          </div>
          <div style={{ flex: '1 1 280px' }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Optional notes for the agent</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. avoid devtool YouTubers, focus on writing/marketing voices" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--ink)' }} />
          </div>
          <button type="button" onClick={run} disabled={phase === 'running'} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            {phase === 'running' ? 'Drafting…' : 'Generate new drafts →'}
          </button>
        </div>
        {info && phase === 'done' && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>{info}</p>}
        {phase === 'error' && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
        {phase === 'running' && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-dim)' }}>Scanning creators · scoring buyer-trust · drafting in your voice. ~45-90 seconds.</p>}
      </div>

      {drafts.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '32px 26px', textAlign: 'center', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>No drafts yet. Run the agent above to generate your first batch.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>
            {queued.length} queued · {drafts.filter((d) => d.status === 'sent').length} sent · {drafts.filter((d) => d.status === 'replied').length} replied · {drafts.filter((d) => d.status === 'skipped').length} skipped
          </p>
          {drafts.map((d) => (
            <div key={d.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 20px', background: 'var(--bg-elev)', opacity: d.status === 'skipped' ? 0.55 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: scoreFg(d.audience_score), background: scoreBg(d.audience_score), borderRadius: 4, padding: '3px 8px' }}>{d.audience_score}</span>
                <a href={`https://x.com/${d.handle}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--ink)', textDecoration: 'none', fontWeight: 600 }}>@{d.handle}</a>
                {d.display_name && <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>· {d.display_name}</span>}
                {d.status && d.status !== 'queued' && (
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 7px', borderRadius: 4, background: d.status === 'sent' ? 'rgba(22,163,74,0.15)' : d.status === 'replied' ? 'var(--accent-soft)' : 'var(--bg-card)', color: d.status === 'sent' ? '#16a34a' : d.status === 'replied' ? 'var(--accent)' : 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {d.status}
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{d.reasoning}</p>
              <pre style={{ margin: '0 0 14px', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)' }}>{d.message_body}</pre>
              {(!d.status || d.status === 'queued') && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => openXDm(d)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Send on X →
                  </button>
                  <button type="button" onClick={() => updateStatus(d.id, 'skipped')} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}>
                    Skip
                  </button>
                </div>
              )}
              {d.status === 'sent' && (
                <button type="button" onClick={() => updateStatus(d.id, 'replied')} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Mark as replied
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

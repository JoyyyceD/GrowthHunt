'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Workspace } from '@/lib/workspace/types'
import type { ColdEmailDraft } from '@/lib/agents/cold-email'

type Phase = 'idle' | 'drafting' | 'done' | 'error'

const PLACEHOLDER = `Jane Doe, jane@acme.com, Acme, VP Marketing, just posted about creator outreach pain
John Roe, john@beta.io, Beta, Head of Growth
hello@gamma.com`

function scoreFg(s: number): string {
  if (s >= 75) return '#16a34a'
  if (s >= 55) return 'var(--warn)'
  return '#c0392b'
}
function scoreBg(s: number): string {
  if (s >= 75) return 'rgba(22,163,74,0.15)'
  if (s >= 55) return 'rgba(176,122,0,0.12)'
  return 'rgba(192,57,43,0.10)'
}

export function ColdEmailRunner({ workspace, allWorkspaces, initialDrafts }: { workspace: Workspace; allWorkspaces: Workspace[]; initialDrafts: ColdEmailDraft[] }) {
  const [drafts, setDrafts] = useState<ColdEmailDraft[]>(initialDrafts)
  const [phase, setPhase] = useState<Phase>('idle')
  const [csv, setCsv] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [sending, setSending] = useState<string | null>(null)

  async function draft() {
    if (!csv.trim()) return
    setPhase('drafting'); setErr(''); setInfo('')
    try {
      const res = await fetch('/api/agents/cold-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, targets_csv: csv, campaign_note: note }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Draft failed.'); setPhase('error'); return }
      // refresh full list
      const list = await fetch(`/api/agents/cold-email?workspace_id=${workspace.id}`)
      if (list.ok) {
        const j = await list.json()
        if (Array.isArray(j.drafts)) setDrafts(j.drafts as ColdEmailDraft[])
      }
      setInfo(data.notes || `Drafted ${data.drafts?.length || 0} emails.`)
      setPhase('done')
    } catch { setErr('Network error.'); setPhase('error') }
  }

  async function send(id: string) {
    setSending(id)
    try {
      const res = await fetch(`/api/agents/cold-email/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Send failed.'); return }
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'sent', sent_at: new Date().toISOString() } : d)))
    } catch { setErr('Network error.') } finally { setSending(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/cold-email?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target list (one per line — name, email, company, role, note)</label>
        <textarea
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={PLACEHOLDER}
          style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
        />
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', margin: '12px 0 6px', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaign note (optional — steer the angle)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. follow-up to our X Grower launch on Product Hunt" style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" onClick={draft} disabled={phase === 'drafting'} style={{ background: phase === 'drafting' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'drafting' ? 'not-allowed' : 'pointer' }}>
            {phase === 'drafting' ? 'Drafting…' : 'Draft emails →'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Up to 25 targets per run · daily send cap 50</span>
        </div>
        {info && phase === 'done' && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>{info}</p>}
        {err && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </div>

      {drafts.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '32px 26px', textAlign: 'center', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>No email drafts yet. Paste targets above to start.</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>Same drafts model as <Link href="/agents/creator" style={{ color: 'var(--ink-dim)' }}>Creator Outreach</Link>; rows live in <code>outreach_drafts</code>.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>
            {drafts.filter((d) => !d.status || d.status === 'queued').length} queued · {drafts.filter((d) => d.status === 'sent').length} sent · {drafts.filter((d) => d.status === 'replied').length} replied
          </p>
          {drafts.map((d) => (
            <div key={d.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 20px', background: 'var(--bg-elev)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: scoreFg(d.audience_score), background: scoreBg(d.audience_score), borderRadius: 4, padding: '3px 8px' }}>{d.audience_score}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{d.email}</span>
                {d.display_name && <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>· {d.display_name}</span>}
                {d.status && d.status !== 'queued' && (
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 7px', borderRadius: 4, background: d.status === 'sent' ? 'rgba(22,163,74,0.15)' : d.status === 'replied' ? 'var(--accent-soft)' : 'var(--bg-card)', color: d.status === 'sent' ? '#16a34a' : d.status === 'replied' ? 'var(--accent)' : 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.status}</span>
                )}
              </div>
              {d.reasoning && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{d.reasoning}</p>}
              <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}><strong style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject: </strong>{d.subject}</div>
              <pre style={{ margin: '0 0 14px', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)' }}>{d.message_body}</pre>
              {(!d.status || d.status === 'queued') && (
                <button type="button" onClick={() => send(d.id)} disabled={sending === d.id} style={{ background: sending === d.id ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: sending === d.id ? 'not-allowed' : 'pointer' }}>
                  {sending === d.id ? 'Sending…' : 'Send via Brevo →'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

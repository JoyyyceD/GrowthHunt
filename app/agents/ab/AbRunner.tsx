'use client'

import { useState, type FormEvent } from 'react'
import type { Workspace } from '@/lib/workspace/types'
import type { AbTest } from '@/lib/agents/ab'
import { detectWinner } from '@/lib/agents/ab'

type Phase = 'idle' | 'creating' | 'done' | 'error'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1.5px solid var(--rule-strong)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'var(--ink)',
  outline: 'none',
}

export function AbRunner({ workspace, allWorkspaces, initialTests }: { workspace: Workspace; allWorkspaces: Workspace[]; initialTests: AbTest[] }) {
  const [tests, setTests] = useState<AbTest[]>(initialTests)
  const [phase, setPhase] = useState<Phase>('idle')
  const [name, setName] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [copies, setCopies] = useState<string[]>(['', ''])
  const [err, setErr] = useState('')

  function updateCopy(i: number, v: string) {
    const next = [...copies]; next[i] = v; setCopies(next)
  }
  function addVariant() {
    if (copies.length < 4) setCopies([...copies, ''])
  }
  function removeVariant(i: number) {
    if (copies.length > 2) setCopies(copies.filter((_, idx) => idx !== i))
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setPhase('creating'); setErr('')
    try {
      const res = await fetch('/api/agents/ab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, name, target_url: targetUrl, copies: copies.filter(Boolean) }),
      })
      const data = await res.json()
      if (!res.ok || !data.test) { setErr(data.error || 'Create failed.'); setPhase('error'); return }
      setTests((prev) => [data.test as AbTest, ...prev])
      setName(''); setTargetUrl(''); setCopies(['', ''])
      setPhase('done')
    } catch { setErr('Network error.'); setPhase('error') }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard blocked */ }
  }

  function trackedUrl(testId: string, key: string): string {
    if (typeof window === 'undefined') return `/ab/${testId}/${key}`
    return `${window.location.origin}/ab/${testId}/${key}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/ab?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <form onSubmit={create} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '22px 24px', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>New A/B test</h2>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Test name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="X DM v1 vs v2" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target URL (where every variant ultimately lands)</label>
          <input required value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://growthhunt.ai/agents/creator" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Variants (2-4 copies)</label>
          {copies.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', padding: '12px 6px', minWidth: 22, textAlign: 'right' }}>{String.fromCharCode(65 + i)}</span>
              <textarea rows={2} required={i < 2} value={c} onChange={(e) => updateCopy(i, e.target.value)} placeholder={`Variant ${String.fromCharCode(65 + i)} copy`} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
              {copies.length > 2 && (
                <button type="button" onClick={() => removeVariant(i)} style={{ background: 'transparent', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--ink-dim)' }}>×</button>
              )}
            </div>
          ))}
          {copies.length < 4 && (
            <button type="button" onClick={addVariant} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px dashed var(--rule-strong)', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>+ Add variant</button>
          )}
        </div>
        <button type="submit" disabled={phase === 'creating'} style={{ background: phase === 'creating' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'creating' ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}>
          {phase === 'creating' ? 'Creating…' : 'Create test → mint tracked URLs'}
        </button>
        {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </form>

      {tests.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '32px 26px', textAlign: 'center', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>No A/B tests yet — create your first above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tests.map((t) => {
            const result = detectWinner(t)
            return (
              <div key={t.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>{t.name}</h3>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>· {t.total_clicks} clicks</span>
                  {result.confidence === 'significant' && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(22,163,74,0.15)', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Winner: {result.winner}</span>
                  )}
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--ink-faint)' }}>Target: <a href={t.target_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-dim)' }}>{t.target_url}</a></p>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: result.confidence === 'significant' ? '#16a34a' : 'var(--ink-dim)' }}>{result.message}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {t.variants.map((v) => {
                    const pct = t.total_clicks ? Math.round((v.clicks / t.total_clicks) * 100) : 0
                    const url = trackedUrl(t.id, v.key)
                    const isWinner = result.confidence === 'significant' && result.winner === v.key
                    return (
                      <div key={v.key} style={{ padding: '10px 14px', background: 'var(--bg)', border: `1px solid ${isWinner ? '#16a34a' : 'var(--rule)'}`, borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', background: isWinner ? '#16a34a' : 'var(--ink)', borderRadius: 4, padding: '3px 8px', minWidth: 22, textAlign: 'center' }}>{v.key}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-dim)' }}>{v.clicks} clicks · {pct}%</span>
                          <div style={{ flex: 1, height: 4, background: 'var(--bg-card)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isWinner ? '#16a34a' : 'var(--accent)' }} />
                          </div>
                        </div>
                        <p style={{ margin: '4px 0 8px', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{v.copy}</p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <code style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-faint)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</code>
                          <button type="button" onClick={() => copy(url)} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Copy</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

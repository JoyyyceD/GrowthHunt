'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import type { Workspace } from '@/lib/workspace/types'

interface RunResult {
  icp_summary: string
  icp_segments: Workspace['icp_segments']
  positioning: string
  key_messages: string[]
  competitors: Workspace['competitors']
  notes: string
}

type Phase = 'idle' | 'running' | 'done' | 'error'

export function IcpRunner({ workspace, allWorkspaces }: { workspace: Workspace; allWorkspaces: Workspace[] }) {
  const router = useRouter()
  const [brief, setBrief] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<RunResult | null>(null)
  const [err, setErr] = useState('')

  async function run(apply: boolean) {
    setPhase('running')
    setErr('')
    try {
      const res = await fetch('/api/agents/icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, brief, apply }),
      })
      const data = await res.json()
      if (!res.ok || !data.result) { setErr(data.error || 'Run failed.'); setPhase('error'); return }
      setResult(data.result as RunResult)
      setPhase('done')
      if (apply) router.refresh()
    } catch { setErr('Network error.'); setPhase('error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select
            value={workspace.id}
            onChange={(e) => { window.location.href = `/agents/icp?ws=${e.target.value}` }}
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}
          >
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <Link href={`/workspace/${workspace.id}`} style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'none' }}>edit →</Link>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Optional brief (give the agent extra context)
        </label>
        <textarea
          rows={4}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Our last 10 paying users were all solo founders building B2B SaaS who came from Twitter…"
          style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="button" disabled={phase === 'running'} onClick={() => run(true)} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer' }}>
            {phase === 'running' ? 'Researching…' : 'Run agent → save to workspace'}
          </button>
          <button type="button" disabled={phase === 'running'} onClick={() => run(false)} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '12px 18px', fontSize: 14, cursor: phase === 'running' ? 'not-allowed' : 'pointer' }}>
            Preview only
          </button>
        </div>
        {phase === 'error' && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Block label="Positioning">{result.positioning || <em style={{ color: 'var(--ink-faint)' }}>(empty)</em>}</Block>
          <Block label="ICP summary">{result.icp_summary}</Block>
          {result.icp_segments.length > 0 && (
            <Block label="ICP segments">
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.icp_segments.map((s, i) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: 1.55 }}>
                    <strong>{s.name}</strong>{s.jtbd ? ` — ${s.jtbd}` : ''}
                    {(s.pains?.length ?? 0) > 0 && <div style={{ color: 'var(--ink-dim)', fontSize: 13 }}>Pains: {(s.pains || []).join('; ')}</div>}
                    {(s.channels?.length ?? 0) > 0 && <div style={{ color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>Channels: {(s.channels || []).join(', ')}</div>}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {result.key_messages.length > 0 && (
            <Block label="Key messages">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.key_messages.map((m, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.55 }}>{m}</li>)}
              </ul>
            </Block>
          )}
          {result.competitors.length > 0 && (
            <Block label="Competitors">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.competitors.map((c, i) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: 1.55 }}>
                    <strong>{c.name}</strong>{c.url ? <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 12 }}> · {c.url}</span> : ''}
                    {c.note && <div style={{ color: 'var(--ink-dim)', fontSize: 13 }}>{c.note}</div>}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {result.notes && <Block label="Agent notes">{result.notes}</Block>}
          <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
            <Link href={`/workspace/${workspace.id}`} style={{ color: 'var(--ink-dim)' }}>Open workspace →</Link>
          </p>
        </div>
      )}
    </div>
  )
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />{label}</div>
      <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

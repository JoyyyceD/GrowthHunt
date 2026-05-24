'use client'

import { useState } from 'react'
import type { Workspace } from '@/lib/workspace/types'

interface LandingDimension {
  id: string
  label: string
  score: number
  finding: string
  suggestion: string
  rewrite?: string
}
interface LandingReport {
  url: string
  overall_score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  fetched_at: string
  status: number
  notice?: string
  dimensions: LandingDimension[]
  hero_rewrite?: { h1: string; subhead: string; cta: string }
  next_steps: string[]
}

type Phase = 'idle' | 'running' | 'done' | 'error'

function color(s: number): string {
  if (s >= 80) return '#16a34a'
  if (s >= 60) return '#65a30d'
  if (s >= 40) return 'var(--warn)'
  return '#c0392b'
}

export function LandingRunner({ workspace, allWorkspaces, initialUrl }: { workspace: Workspace; allWorkspaces: Workspace[]; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl || workspace.url)
  const [phase, setPhase] = useState<Phase>('idle')
  const [report, setReport] = useState<LandingReport | null>(null)
  const [err, setErr] = useState('')

  async function run() {
    if (!url.trim()) return
    setPhase('running'); setErr('')
    try {
      const res = await fetch('/api/agents/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.report) { setErr(data.error || 'Audit failed.'); setPhase('error'); return }
      setReport(data.report as LandingReport)
      setPhase('done')
    } catch { setErr('Network error.'); setPhase('error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/landing?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="your-landing-page.com"
          style={{ flex: '1 1 280px', background: 'var(--bg-elev)', border: '1.5px solid var(--rule-strong)', borderRadius: 999, padding: '14px 22px', fontSize: 15, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', minWidth: 0 }}
        />
        <button type="button" onClick={run} disabled={phase === 'running'} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 28px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {phase === 'running' ? 'Auditing…' : 'Audit landing page →'}
        </button>
      </div>

      {phase === 'error' && <div style={{ padding: '14px 18px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, fontSize: 14, color: '#c0392b' }}>{err}</div>}
      {phase === 'running' && (
        <div style={{ padding: '20px 22px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Reading the page</div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>Fetching, scoring 6 dimensions, drafting rewrites. ~15-25 seconds.</p>
        </div>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {report.notice && <div style={{ padding: '14px 18px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, fontSize: 14, color: '#c0392b' }}>{report.notice}</div>}

          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '22px 24px', background: 'var(--bg-elev)' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}><span className="dot" />Conversion score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 72, lineHeight: 0.9, color: color(report.overall_score) }}>{report.overall_score}</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink-faint)' }}>/100</span>
              <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: '#fff', background: color(report.overall_score), borderRadius: 4, padding: '3px 8px' }}>{report.grade}</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-dim)', wordBreak: 'break-all' }}>{report.url}</p>
          </div>

          {report.hero_rewrite && (
            <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '22px 24px' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Hero rewrite</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 10px' }}>{report.hero_rewrite.h1}</div>
              <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--ink)', lineHeight: 1.55 }}>{report.hero_rewrite.subhead}</p>
              <button type="button" style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 20px', fontSize: 13, fontWeight: 600 }}>
                {report.hero_rewrite.cta}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {report.dimensions.map((d) => (
              <div key={d.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px', background: 'var(--bg-elev)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: '#fff', background: color(d.score), borderRadius: 4, padding: '3px 8px', minWidth: 38, textAlign: 'center' }}>{d.score}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{d.label}</span>
                </div>
                {d.finding && <p style={{ margin: '0 0 6px', fontSize: 13.5, color: 'var(--ink-dim)', lineHeight: 1.55 }}>{d.finding}</p>}
                {d.suggestion && <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--accent)', lineHeight: 1.55 }}>→ {d.suggestion}</p>}
                {d.rewrite && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paste-ready rewrite</summary>
                    <pre style={{ margin: '10px 0 0', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--ink)', lineHeight: 1.5 }}>{d.rewrite}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {report.next_steps.length > 0 && (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Next steps</div>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.next_steps.map((s, i) => <li key={i} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

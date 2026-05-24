'use client'

import { useState } from 'react'
import type { Workspace } from '@/lib/workspace/types'
import type { CompetitorSnapshot, CompetitorDiff } from '@/lib/agents/competitor'

type Phase = 'idle' | 'running' | 'done' | 'error'

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

const KIND_BG: Record<CompetitorDiff['kind'], { bg: string; fg: string }> = {
  pricing:     { bg: 'rgba(192,57,43,0.12)', fg: '#c0392b' },
  copy:        { bg: 'rgba(176,122,0,0.12)', fg: 'var(--warn)' },
  headline:    { bg: 'rgba(101,163,13,0.12)', fg: '#16a34a' },
  new_section: { bg: 'var(--accent-soft)',   fg: 'var(--accent)' },
}

export function CompetitorRunner({ workspace, allWorkspaces, initialSnapshots, initialDiffs }: { workspace: Workspace; allWorkspaces: Workspace[]; initialSnapshots: CompetitorSnapshot[]; initialDiffs: CompetitorDiff[] }) {
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[]>(initialSnapshots)
  const [diffs, setDiffs] = useState<CompetitorDiff[]>(initialDiffs)
  const [phase, setPhase] = useState<Phase>('idle')
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')

  async function scan() {
    setPhase('running'); setErr(''); setInfo('')
    try {
      const res = await fetch('/api/agents/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, diff: true }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || data.notes || 'Scan failed.'); setPhase('error'); return }
      setInfo(`${data.snapshots} snapshot(s), ${data.diffs} change(s) detected · ${data.notes || ''}`)
      const refreshed = await fetch(`/api/agents/competitor?workspace_id=${workspace.id}`)
      if (refreshed.ok) {
        const j = await refreshed.json()
        if (Array.isArray(j.snapshots)) setSnapshots(j.snapshots as CompetitorSnapshot[])
        if (Array.isArray(j.diffs)) setDiffs(j.diffs as CompetitorDiff[])
      }
      setPhase('done')
    } catch { setErr('Network error.'); setPhase('error') }
  }

  const byUrl = new Map<string, CompetitorSnapshot[]>()
  for (const s of snapshots) {
    const arr = byUrl.get(s.competitor_url) || []
    arr.push(s)
    byUrl.set(s.competitor_url, arr)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {allWorkspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Workspace:</span>
          <select value={workspace.id} onChange={(e) => { window.location.href = `/agents/competitor?ws=${e.target.value}` }} style={{ background: 'var(--bg-elev)', border: '1px solid var(--rule-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
            {allWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button type="button" onClick={scan} disabled={phase === 'running'} style={{ background: phase === 'running' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'running' ? 'not-allowed' : 'pointer' }}>
            {phase === 'running' ? 'Scanning…' : 'Scan now →'}
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>
              Watching <strong>{(workspace.competitors || []).filter((c) => c.url).length}</strong> competitor URL(s) from your workspace. The weekly cron runs Tuesdays 09:00 UTC.
            </p>
          </div>
        </div>
        {info && phase === 'done' && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>{info}</p>}
        {err && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}
      </div>

      {diffs.length > 0 ? (
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}><span className="dot" />Recent changes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diffs.map((d) => {
              const kindStyle = KIND_BG[d.kind] || KIND_BG.copy
              return (
                <div key={d.id} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px', background: 'var(--bg-elev)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: kindStyle.fg, background: kindStyle.bg, borderRadius: 4, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.kind}</span>
                    <a href={d.competitor_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', textDecoration: 'none', fontWeight: 600 }}>{host(d.competitor_url)}</a>
                    <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 'auto' }}>{new Date(d.detected_at).toISOString().slice(0, 10)}</span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>{d.summary}</p>
                  {(d.before_excerpt || d.after_excerpt) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                      <div style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 12, color: 'var(--ink-dim)' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Before</div>
                        {d.before_excerpt || '—'}
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 12, color: 'var(--ink)' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>After</div>
                        {d.after_excerpt || '—'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '32px 26px', textAlign: 'center', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>No changes detected yet — run a scan or wait for the weekly cron.</p>
        </div>
      )}

      {snapshots.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}><span className="dot" />Snapshot history</div>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elev)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Competitor</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Latest</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, width: 90 }}>Snapshots</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byUrl.entries()).map(([url, list]) => (
                  <tr key={url} style={{ borderTop: '1px solid var(--rule)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>{host(url)} ↗</a>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--ink-dim)' }}>
                      {new Date(list[0]!.created_at).toISOString().slice(0, 10)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
                      {list.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

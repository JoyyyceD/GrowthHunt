'use client'

import type { AuditResult, DimensionResult } from '@/lib/audit/types'

interface AuditEntry {
  url: string
  role: 'primary' | 'competitor'
  ok: boolean
  result: AuditResult | null
  error: string | null
}

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function scoreColor(s: number): string {
  if (s >= 70) return '#16a34a'
  if (s >= 45) return 'var(--warn)'
  return '#c0392b'
}

function pctBg(p: number): string {
  if (p >= 70) return 'rgba(22,163,74,0.12)'
  if (p >= 45) return 'rgba(176,122,0,0.12)'
  return 'rgba(192,57,43,0.12)'
}

function pctFg(p: number): string {
  if (p >= 70) return '#16a34a'
  if (p >= 45) return 'var(--warn)'
  return '#c0392b'
}

/** Build a union of every dimension across audits (defensive — rubric is stable). */
function dimensionUnion(audits: AuditEntry[]): Array<{ id: string; label: string; weight: number }> {
  const seen = new Map<string, { id: string; label: string; weight: number }>()
  for (const a of audits) {
    if (!a.result) continue
    for (const d of a.result.dimensions) {
      if (!seen.has(d.id)) seen.set(d.id, { id: d.id, label: d.label, weight: d.weight })
    }
  }
  return Array.from(seen.values())
}

function dimPercent(result: AuditResult, id: string): number | null {
  const d: DimensionResult | undefined = result.dimensions.find((x) => x.id === id)
  return d ? d.percent : null
}

function gapAnalysis(audits: AuditEntry[]): { id: string; label: string; weakBy: number; bestUrl: string }[] {
  const primary = audits.find((a) => a.role === 'primary')
  if (!primary?.result) return []
  const competitors = audits.filter((a) => a.role === 'competitor' && a.result)
  if (competitors.length === 0) return []

  const out: { id: string; label: string; weakBy: number; bestUrl: string }[] = []
  for (const d of primary.result.dimensions) {
    const myScore = d.percent
    let bestCompetitor = competitors[0]!
    let bestPercent = -1
    for (const c of competitors) {
      const p = dimPercent(c.result!, d.id) ?? 0
      if (p > bestPercent) { bestPercent = p; bestCompetitor = c }
    }
    const weakBy = bestPercent - myScore
    if (weakBy > 0) out.push({ id: d.id, label: d.label, weakBy, bestUrl: bestCompetitor.url })
  }
  out.sort((a, b) => b.weakBy - a.weakBy)
  return out.slice(0, 6)
}

export function CompeteMatrix({ audits }: { audits: AuditEntry[] }) {
  const dims = dimensionUnion(audits)
  const gaps = gapAnalysis(audits)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overall score row */}
      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elev)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)' }}>
              <th style={{ textAlign: 'left', padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>URL</th>
              <th style={{ textAlign: 'right', padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, width: 110 }}>Score</th>
              <th style={{ textAlign: 'right', padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, width: 80 }}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.url} style={{ borderTop: '1px solid var(--rule)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {a.role === 'primary' && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '2px 6px' }}>YOU</span>
                    )}
                    <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: a.role === 'primary' ? 600 : 400 }}>{host(a.url)}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: a.result ? scoreColor(a.result.overall_score) : 'var(--ink-faint)' }}>
                  {a.result ? `${a.result.overall_score}/100` : '—'}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  {a.result ? (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: '#fff', background: scoreColor(a.result.overall_score), borderRadius: 4, padding: '3px 8px' }}>
                      {a.result.grade}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#c0392b' }}>err</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dimension-by-dimension matrix */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 12 }}><span className="dot" />Dimension-by-dimension</div>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'auto', background: 'var(--bg-elev)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--bg-card)' }}>
                  Dimension
                </th>
                {audits.map((a) => (
                  <th key={a.url} style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, minWidth: 110 }}>
                    {a.role === 'primary' ? <span style={{ color: 'var(--accent)' }}>★ {host(a.url)}</span> : host(a.url)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dims.map((dim) => (
                <tr key={dim.id} style={{ borderTop: '1px solid var(--rule)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--ink)', position: 'sticky', left: 0, background: 'var(--bg-elev)' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{dim.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>weight {dim.weight}</div>
                  </td>
                  {audits.map((a) => {
                    const p = a.result ? dimPercent(a.result, dim.id) : null
                    if (p === null) return <td key={a.url} style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 12 }}>—</td>
                    return (
                      <td key={a.url} style={{ padding: 6, textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', minWidth: 56, padding: '6px 10px', borderRadius: 6, background: pctBg(p), color: pctFg(p), fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>
                          {p}%
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gap callouts */}
      {gaps.length > 0 && (
        <div style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '24px 26px' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: '0 0 12px' }}>
            Where competitors beat you
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gaps.map((g) => (
              <li key={g.id} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>
                <strong>{g.label}</strong> — competitor at <span style={{ fontFamily: 'var(--mono)' }}>{host(g.bestUrl)}</span> beats you by <span style={{ color: '#c0392b', fontWeight: 600 }}>{g.weakBy} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

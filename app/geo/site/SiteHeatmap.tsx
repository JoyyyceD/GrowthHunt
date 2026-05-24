'use client'

interface PageResult {
  url: string
  score: number | null
  dims: Record<string, number>
  status: 'ok' | 'limited' | 'error'
  error?: string
}
interface SiteAuditRow {
  id: string
  domain: string
  sitemap_url: string
  status: 'running' | 'done' | 'error'
  total_urls: number
  audited_urls: number
  pages: PageResult[]
}

const DIMENSION_ORDER: Array<{ id: string; short: string; label: string }> = [
  { id: 'crawler-access', short: 'Crawl', label: 'Crawler Access' },
  { id: 'discovery', short: 'Disco', label: 'Indexability & Discovery' },
  { id: 'structure', short: 'Struct', label: 'Structure' },
  { id: 'schema', short: 'Schema', label: 'Schema' },
  { id: 'factual-density', short: 'Facts', label: 'Factual Density' },
  { id: 'entity-clarity', short: 'Entity', label: 'Entity Clarity' },
  { id: 'freshness', short: 'Fresh', label: 'Freshness' },
  { id: 'first-answer', short: 'Answer', label: 'First Answer' },
]

function path(url: string): string {
  try {
    const u = new URL(url)
    const p = u.pathname + (u.search || '')
    return p === '/' ? '/' : p
  } catch { return url }
}

function bg(p: number | null): string {
  if (p === null) return 'var(--bg-card)'
  if (p >= 80) return '#15803d'
  if (p >= 65) return '#65a30d'
  if (p >= 50) return '#ca8a04'
  if (p >= 35) return '#d97706'
  return '#c0392b'
}

function fg(p: number | null): string {
  if (p === null) return 'var(--ink-faint)'
  return '#fff'
}

function scoreColor(s: number | null): string {
  if (s === null) return 'var(--ink-faint)'
  if (s >= 70) return '#16a34a'
  if (s >= 45) return 'var(--warn)'
  return '#c0392b'
}

export function SiteHeatmap({ row }: { row: SiteAuditRow }) {
  const pages = [...row.pages].sort((a, b) => {
    if (a.score === null && b.score === null) return 0
    if (a.score === null) return 1
    if (b.score === null) return -1
    return a.score - b.score   // weakest first — that's what users want to fix
  })

  const okPages = pages.filter((p) => p.score !== null)
  const avg = okPages.length > 0
    ? Math.round(okPages.reduce((s, p) => s + (p.score || 0), 0) / okPages.length)
    : null
  const worst = okPages[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
          <div className="eyebrow"><span className="dot" />Site average</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1, color: scoreColor(avg), marginTop: 8 }}>
            {avg ?? '—'}<span style={{ fontSize: 20, color: 'var(--ink-faint)' }}>/100</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-dim)' }}>
            Across {okPages.length} pages on <strong>{row.domain.replace(/^https?:\/\//, '')}</strong>
          </p>
        </div>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
          <div className="eyebrow"><span className="dot" />Weakest page</div>
          {worst ? (
            <>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1, color: scoreColor(worst.score), marginTop: 8 }}>
                {worst.score}<span style={{ fontSize: 16, color: 'var(--ink-faint)' }}>/100</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-dim)', wordBreak: 'break-all' }}>
                {path(worst.url)}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-dim)' }}>—</p>
          )}
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 12 }}><span className="dot" />Heatmap · weakest pages first</div>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'auto', background: 'var(--bg-elev)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--bg-card)', minWidth: 200 }}>
                  Page
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, width: 70 }}>
                  Score
                </th>
                {DIMENSION_ORDER.map((d) => (
                  <th key={d.id} title={d.label} style={{ padding: '12px 4px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, minWidth: 56 }}>
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.url} style={{ borderTop: '1px solid var(--rule)' }}>
                  <td style={{ padding: '8px 16px', color: 'var(--ink)', position: 'sticky', left: 0, background: 'var(--bg-elev)' }}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: 12.5, fontFamily: 'var(--mono)' }}>
                      {path(p.url)}
                    </a>
                    {p.status === 'limited' && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--warn)', fontFamily: 'var(--mono)' }}>SPA</span>}
                    {p.status === 'error' && <span style={{ marginLeft: 8, fontSize: 10, color: '#c0392b', fontFamily: 'var(--mono)' }}>ERR</span>}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: scoreColor(p.score) }}>
                    {p.score ?? '—'}
                  </td>
                  {DIMENSION_ORDER.map((d) => {
                    const v = p.dims[d.id]
                    return (
                      <td key={d.id} style={{ padding: 3, textAlign: 'center' }}>
                        <div title={typeof v === 'number' ? `${d.label}: ${v}%` : `${d.label}: —`}
                             style={{ background: bg(typeof v === 'number' ? v : null), color: fg(typeof v === 'number' ? v : null), borderRadius: 4, padding: '6px 4px', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600 }}>
                          {typeof v === 'number' ? v : '—'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '8px 0 0' }}>
          Click any page to open it. Sorted weakest-first — fix the red rows first.
        </p>
      </div>
    </div>
  )
}

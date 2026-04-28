import type { Directory } from '@/lib/directories'

// "32.1M" → 32_100_000, "650K" → 650_000, "" → 0
function parseTraffic(t: string | null): number {
  if (!t) return 0
  const m = t.match(/^(\d+(?:\.\d+)?)\s*([MKk]?)$/)
  if (!m) return 0
  const n = parseFloat(m[1])
  const suffix = m[2].toUpperCase()
  if (suffix === 'M') return n * 1_000_000
  if (suffix === 'K') return n * 1_000
  return n
}

function formatBig(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${m >= 100 ? Math.round(m) : m.toFixed(1)}M`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toString()
}

export default function DirectoriesScore({ directories }: { directories: Directory[] }) {
  // ── Aggregate real metrics ────────────────────────────────────────────────
  const totalDirs = directories.length
  const totalReach = directories.reduce((sum, d) => sum + parseTraffic(d.trafficText), 0)
  const drValues = directories.map(d => d.dr).filter((x): x is number => x !== null)
  const avgDr = drValues.length ? Math.round(drValues.reduce((a, b) => a + b, 0) / drValues.length) : 0
  const dr80Plus = directories.filter(d => (d.dr ?? 0) >= 80).length

  // ── Chart data: cumulative reach as directories add up (sorted by DR desc) ─
  const sorted = [...directories].sort((a, b) => (b.dr ?? 0) - (a.dr ?? 0))
  let cum = 0
  let cumDr = 0
  const points = sorted.map((d, i) => {
    cum += parseTraffic(d.trafficText)
    cumDr += d.dr ?? 0
    return { i: i + 1, reach: cum, drSum: cumDr }
  })

  // ── SVG geometry ──────────────────────────────────────────────────────────
  const W = 1000
  const H = 280
  const PAD = { left: 70, right: 70, top: 24, bottom: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxReach = points[points.length - 1]?.reach ?? 1
  const maxDrSum = points[points.length - 1]?.drSum ?? 1
  const maxRank = points.length || 1

  function xAt(i: number) {
    return PAD.left + ((i - 1) / Math.max(maxRank - 1, 1)) * innerW
  }
  function yReach(reach: number) {
    return PAD.top + innerH - (reach / maxReach) * innerH
  }
  function yDr(drSum: number) {
    return PAD.top + innerH - (drSum / maxDrSum) * innerH
  }

  const reachPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xAt(p.i).toFixed(2)} ${yReach(p.reach).toFixed(2)}`).join(' ')
  const reachArea = `${reachPath} L ${xAt(points[points.length - 1]?.i ?? 1).toFixed(2)} ${(PAD.top + innerH).toFixed(2)} L ${xAt(1).toFixed(2)} ${(PAD.top + innerH).toFixed(2)} Z`
  const drPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xAt(p.i).toFixed(2)} ${yDr(p.drSum).toFixed(2)}`).join(' ')

  const reachTicks = [0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + innerH - f * innerH,
    label: formatBig(f * maxReach),
  }))
  const drTicks = [0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + innerH - f * innerH,
    label: Math.round(f * maxDrSum).toLocaleString(),
  }))
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const i = Math.max(1, Math.round(f * maxRank))
    return { x: xAt(i), label: `${Math.round(f * 100)}%` }
  })

  const stats = [
    { key: 'reach',   label: 'Combined reach',  value: `${formatBig(totalReach)}+`, active: true  },
    { key: 'dirs',    label: 'Hand-picked',     value: '200+',                       active: true  },
    { key: 'avg-dr',  label: 'Average DR',      value: avgDr.toString(),             active: false },
    { key: 'premium', label: 'DR 80+',          value: dr80Plus.toString(),          active: false },
  ]

  return (
    <section style={{ padding: '80px 0', background: 'var(--bg-card)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
      <div className="shell">
        {/* Eyebrow */}
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          <span className="dot" />Traffic from relevant audience
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 400,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          margin: '0 0 14px',
          color: 'var(--ink)',
        }}>
          Directories score <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{formatBig(totalReach)}+</em> visitors/mo.
        </h2>
        <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 640, lineHeight: 1.6, margin: '0 0 36px' }}>
          We submit to <strong style={{ color: 'var(--ink)' }}>200+ hand-picked directories</strong> your buyers already trust. Backlinks compound — each one is a vote that lifts your search rank, indexes your site faster, and sends real referral traffic.
        </p>

        {/* Stats strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 0,
          background: 'var(--bg-elev)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          marginBottom: 32,
          overflow: 'hidden',
        }}>
          {stats.map((s, i, arr) => (
            <div
              key={s.key}
              style={{
                background: s.active ? 'var(--accent-soft)' : 'var(--bg-elev)',
                padding: '20px 24px',
                borderRight: i < arr.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: s.active ? 'var(--accent)' : 'var(--ink-faint)', marginBottom: 8, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span style={{
                  display: 'inline-flex',
                  width: 14, height: 14,
                  border: `1.5px solid ${s.active ? 'var(--accent)' : 'var(--rule-strong)'}`,
                  borderRadius: 3,
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 10,
                  color: s.active ? 'var(--accent)' : 'transparent',
                  background: s.active ? 'rgba(232, 78, 27, 0.10)' : 'transparent',
                  flexShrink: 0,
                }}>{s.active ? '✓' : ''}</span>
                {s.label}
              </div>
              <div style={{
                fontFamily: 'var(--serif)',
                fontSize: 36,
                fontWeight: 400,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          padding: '24px 16px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cumulative reach (left)</span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cumulative DR points (right)</span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 280, display: 'block' }}>
            <defs>
              <linearGradient id="reachFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y-axis grid + reach labels (left) */}
            {reachTicks.map((t, idx) => (
              <g key={`yl-${idx}`}>
                <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="var(--rule)" strokeDasharray="3 3" />
                <text x={PAD.left - 10} y={t.y + 4} textAnchor="end" fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)">{t.label}</text>
              </g>
            ))}

            {/* Y-axis DR labels (right) */}
            {drTicks.map((t, idx) => (
              <text key={`yr-${idx}`} x={W - PAD.right + 10} y={t.y + 4} textAnchor="start" fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)">{t.label}</text>
            ))}

            {/* X-axis labels */}
            {xTicks.map((t, idx) => (
              <text key={`x-${idx}`} x={t.x} y={H - 8} textAnchor="middle" fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)">{t.label}</text>
            ))}

            {/* Reach area */}
            <path d={reachArea} fill="url(#reachFill)" />
            {/* Reach line (orange accent) */}
            <path d={reachPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
            {/* DR cumulative line (ink-dim, secondary) */}
            <path d={drPath} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="4 3" opacity="0.55" />

            {/* Bottom axis line */}
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--rule-strong)" />

            {/* X axis caption */}
            <text x={PAD.left + innerW / 2} y={H - 22} textAnchor="middle" fill="var(--ink-faint)" fontSize="10" fontFamily="var(--mono)" letterSpacing="0.1em">DIRECTORIES SUBMITTED</text>
          </svg>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 16px 4px', fontSize: 12, color: 'var(--ink-dim)', borderTop: '1px solid var(--rule)', marginTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--accent)' }} />
              Cumulative monthly reach
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 14, height: 1.5, background: 'var(--ink)', opacity: 0.55, borderTop: '1px dashed currentColor' }} />
              Cumulative DR points
            </span>
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 16, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Reach = Σ monthly visitors across our directory database · Sourced from Ahrefs / SimilarWeb · Updated quarterly
        </p>
      </div>
    </section>
  )
}

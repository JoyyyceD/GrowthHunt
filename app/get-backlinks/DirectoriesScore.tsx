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
  const sorted = [...directories]
    .sort((a, b) => (b.dr ?? 0) - (a.dr ?? 0))
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

  // Y-axis label ticks (5 levels)
  const reachTicks = [0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + innerH - f * innerH,
    label: formatBig(f * maxReach),
  }))
  const drTicks = [0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + innerH - f * innerH,
    label: Math.round(f * maxDrSum).toLocaleString(),
  }))

  // X-axis ticks at 0, 25%, 50%, 75%, 100% of directories
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const i = Math.max(1, Math.round(f * maxRank))
    return { x: xAt(i), label: i.toString() }
  })

  return (
    <section style={{ padding: '64px 0', background: '#0e0e10', color: '#fafaf7', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
      <div className="shell">
        {/* Eyebrow */}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bef264', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#bef264' }}>#</span>
          <span>Traffic from relevant audience</span>
        </div>

        {/* Headline */}
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 14px', color: '#fafaf7' }}>
          Directories score <span style={{ color: '#bef264' }}>{formatBig(totalReach)}+</span> visitors/mo
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(250,250,247,0.6)', maxWidth: 640, lineHeight: 1.6, margin: '0 0 36px' }}>
          We submit to <strong style={{ color: '#fafaf7' }}>{totalDirs} hand-picked directories</strong> your buyers already trust. Backlinks compound. Each one is a vote that lifts your search rank, indexes your site faster, and sends real referral traffic.
        </p>

        {/* Stats strip — listingbott checkbox style */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, marginBottom: 32, overflow: 'hidden' }}>
          {[
            { key: 'reach',    label: 'Combined reach',  value: `${formatBig(totalReach)}+`, accent: '#bef264', active: true },
            { key: 'dirs',     label: 'Hand-picked',     value: totalDirs.toString(),         accent: '#7dd3fc', active: true },
            { key: 'avg-dr',   label: 'Average DR',      value: avgDr.toString(),             accent: 'rgba(255,255,255,0.5)', active: false },
            { key: 'premium',  label: 'DR 80+',          value: dr80Plus.toString(),          accent: 'rgba(255,255,255,0.5)', active: false },
          ].map((s, i, arr) => (
            <div
              key={s.key}
              style={{
                background: s.active ? (s.key === 'reach' ? 'rgba(190,242,100,0.12)' : 'rgba(125,211,252,0.10)') : 'transparent',
                padding: '20px 24px',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: s.active ? s.accent : 'rgba(250,250,247,0.5)', marginBottom: 8, fontWeight: 500 }}>
                <span style={{
                  display: 'inline-flex',
                  width: 14, height: 14,
                  border: `1.5px solid ${s.active ? s.accent : 'rgba(250,250,247,0.4)'}`,
                  borderRadius: 3,
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: s.accent,
                  background: s.active ? `${s.accent}22` : 'transparent',
                }}>{s.active ? '✓' : ''}</span>
                {s.label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#fafaf7', letterSpacing: '-0.01em', lineHeight: 1, fontFamily: 'var(--mono)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '24px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(250,250,247,0.5)', fontFamily: 'var(--mono)' }}>Cumulative reach (left)</span>
            <span style={{ fontSize: 11, color: 'rgba(250,250,247,0.5)', fontFamily: 'var(--mono)' }}>Cumulative DR points (right)</span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 280, display: 'block' }}>
            <defs>
              <linearGradient id="reachFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#bef264" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y left labels (reach) */}
            {reachTicks.map((t, idx) => (
              <g key={`yl-${idx}`}>
                <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <text x={PAD.left - 10} y={t.y + 4} textAnchor="end" fill="rgba(250,250,247,0.5)" fontSize="11" fontFamily="var(--mono)">{t.label}</text>
              </g>
            ))}

            {/* Y right labels (DR cumulative) */}
            {drTicks.map((t, idx) => (
              <text key={`yr-${idx}`} x={W - PAD.right + 10} y={t.y + 4} textAnchor="start" fill="rgba(250,250,247,0.5)" fontSize="11" fontFamily="var(--mono)">{t.label}</text>
            ))}

            {/* X labels */}
            {xTicks.map((t, idx) => (
              <text key={`x-${idx}`} x={t.x} y={H - 8} textAnchor="middle" fill="rgba(250,250,247,0.5)" fontSize="11" fontFamily="var(--mono)">{t.label}</text>
            ))}

            {/* Reach area */}
            <path d={reachArea} fill="url(#reachFill)" />
            {/* Reach line */}
            <path d={reachPath} fill="none" stroke="#bef264" strokeWidth="2.5" strokeLinejoin="round" />
            {/* DR cumulative line (right axis) */}
            <path d={drPath} fill="none" stroke="#7dd3fc" strokeWidth="2" strokeLinejoin="round" strokeDasharray="0" opacity="0.85" />

            {/* Bottom axis line */}
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.15)" />

            {/* X axis caption */}
            <text x={PAD.left + innerW / 2} y={H - 22} textAnchor="middle" fill="rgba(250,250,247,0.4)" fontSize="10" fontFamily="var(--mono)" letterSpacing="0.1em">DIRECTORIES SUBMITTED</text>
          </svg>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '0 16px', marginTop: 4, fontSize: 12, color: 'rgba(250,250,247,0.6)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 10, height: 2, background: '#bef264' }} /> Cumulative monthly reach
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 10, height: 2, background: '#7dd3fc' }} /> Cumulative DR points
            </span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(250,250,247,0.4)', marginTop: 16, fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>
          Reach = Σ monthly visitors across {totalDirs} directories · Sourced from Ahrefs / SimilarWeb · Updated quarterly
        </p>
      </div>
    </section>
  )
}

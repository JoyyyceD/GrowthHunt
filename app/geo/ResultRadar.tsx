'use client'

import type { AuditResult } from '@/lib/audit'

const SHORT: Record<string, string> = {
  'crawler-access': 'Crawler',
  'discovery': 'Discovery',
  'structure': 'Structure',
  'schema': 'Schema',
  'factual-density': 'Facts',
  'entity-clarity': 'Entity',
  'freshness': 'Freshness',
  'first-answer': 'First Answer',
}

/** Hand-rolled SVG radar over the 8 dimension percentages. */
export function ResultRadar({ dimensions }: { dimensions: AuditResult['dimensions'] }) {
  const n = dimensions.length
  if (n === 0) return null

  const size = 320
  const cx = size / 2
  const cy = size / 2
  const maxR = 94

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, r: number): [number, number] => [
    cx + Math.cos(angle(i)) * r,
    cy + Math.sin(angle(i)) * r,
  ]
  const ringPoints = (r: number) =>
    dimensions.map((_, i) => point(i, r).join(',')).join(' ')

  const dataPts = dimensions.map((d, i) => point(i, maxR * (d.percent / 100)))

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: 340, overflow: 'visible' }}
      role="img"
      aria-label="GEO dimension radar"
    >
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={ringPoints(maxR * r)} fill="none" stroke="var(--rule)" strokeWidth={1} />
      ))}
      {dimensions.map((_, i) => {
        const [x, y] = point(i, maxR)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" strokeWidth={1} />
      })}

      <polygon
        points={dataPts.map((p) => p.join(',')).join(' ')}
        fill="rgba(232,78,27,0.15)"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="var(--accent)" />
      ))}

      {dimensions.map((d, i) => {
        const [x, y] = point(i, maxR + 24)
        const a = angle(i)
        const anchor = Math.abs(Math.cos(a)) < 0.35 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
        return (
          <text
            key={d.id}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={9}
            fontFamily="var(--mono)"
            fill="var(--ink-dim)"
          >
            {SHORT[d.id] ?? d.label}
          </text>
        )
      })}
    </svg>
  )
}

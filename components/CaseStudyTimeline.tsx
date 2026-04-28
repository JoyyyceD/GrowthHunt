'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { line, curveMonotoneX } from 'd3-shape'
import type { Timeline, TimelineEvent, DataPoint, EventType } from '@/lib/growth-story'

const TYPE_COLOR: Record<EventType, string> = {
  product: '#2563eb',
  funding: '#16a34a',
  media: '#dc2626',
  acquisition: '#9333ea',
}

const TYPE_LABEL: Record<EventType, string> = {
  product: 'Product',
  funding: 'Funding',
  media: 'Media',
  acquisition: 'M&A',
}

// Order from top to bottom of the chart (top band = Product, bottom = M&A)
const LANE_BANDS: {
  type: EventType
  arrMin: number
  arrMax: number
}[] = [
  { type: 'product', arrMin: 1_500_000_000, arrMax: 2_000_000_000 },
  { type: 'funding', arrMin: 1_000_000_000, arrMax: 1_500_000_000 },
  { type: 'media', arrMin: 500_000_000, arrMax: 1_000_000_000 },
  { type: 'acquisition', arrMin: 0, arrMax: 500_000_000 },
]

const ARR_COLOR = '#14110d'
const VAL_COLOR = '#e84e1b'

const VBOX_W = 1320
const VBOX_H = 720
const PAD = { top: 70, right: 96, bottom: 70, left: 124 }
const CHART_TOP = PAD.top
const CHART_BOTTOM = VBOX_H - PAD.bottom
const CHART_LEFT = PAD.left
const CHART_RIGHT = VBOX_W - PAD.right
const CHART_W = CHART_RIGHT - CHART_LEFT
const CHART_H = CHART_BOTTOM - CHART_TOP

const toTime = (s: string) => new Date(s).getTime()

function formatMoney(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(v >= 10_000_000_000 ? 0 : 1)}B`
  if (v >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

function formatDateShort(s: string): string {
  const d = new Date(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDateLong(s: string): string {
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

interface HoverState {
  x: number
  y: number
  kind: 'event' | 'arr' | 'val'
  event?: TimelineEvent
  point?: DataPoint
}

interface Props {
  timeline: Timeline
  company: string
}

export default function CaseStudyTimeline({ timeline, company }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const xDomain = useMemo<[number, number]>(() => {
    return [toTime('2022-12-01'), toTime('2026-06-01')]
  }, [])

  const arrMax = 2_200_000_000
  const valMax = Math.max(...timeline.valuation.map(p => p.value)) * 1.12

  const xScale = (t: number) =>
    CHART_LEFT + ((t - xDomain[0]) / (xDomain[1] - xDomain[0])) * CHART_W
  const yArr = (v: number) => CHART_BOTTOM - (v / arrMax) * CHART_H
  const yVal = (v: number) => CHART_BOTTOM - (v / valMax) * CHART_H

  const lineArr = line<DataPoint>()
    .x(d => xScale(toTime(d.date)))
    .y(d => yArr(d.value))
    .curve(curveMonotoneX)
  const lineVal = line<DataPoint>()
    .x(d => xScale(toTime(d.date)))
    .y(d => yVal(d.value))
    .curve(curveMonotoneX)

  const arrPath = lineArr(timeline.arr) ?? ''
  const valPath = lineVal(timeline.valuation) ?? ''

  const arrTicks = useMemo(() => {
    const step = 500_000_000
    const ticks: number[] = []
    for (let v = 0; v <= arrMax; v += step) ticks.push(v)
    return ticks
  }, [])

  const valTicks = useMemo(() => {
    const step = 10_000_000_000
    const ticks: number[] = []
    for (let v = 0; v <= valMax; v += step) ticks.push(v)
    return ticks
  }, [valMax])

  const xTicks = useMemo(() => {
    const ticks: { t: number; label: string; major: boolean }[] = []
    for (let y = 2023; y <= 2026; y++) {
      ticks.push({ t: toTime(`${y}-01-01`), label: `${y}`, major: true })
      ticks.push({ t: toTime(`${y}-07-01`), label: ``, major: false })
    }
    return ticks
  }, [])

  // Distribute events. Y is determined by their type's band center.
  const laidOutEvents = useMemo(() => {
    const sorted = [...timeline.events].sort((a, b) => toTime(a.date) - toTime(b.date))
    const counters: Record<EventType, number> = { product: 0, funding: 0, media: 0, acquisition: 0 }
    return sorted.map(e => {
      const band = LANE_BANDS.find(b => b.type === e.type)!
      const bandCenter = (band.arrMin + band.arrMax) / 2
      const y = yArr(bandCenter)
      const inLane = counters[e.type]++
      return { ...e, y, inLane, band }
    })
  }, [timeline.events])

  const typesUsed = useMemo(
    () => new Set(timeline.events.map(e => e.type)),
    [timeline.events]
  )

  const phaseRects = timeline.phases.map(p => {
    const x1 = Math.max(CHART_LEFT, xScale(toTime(p.start)))
    const x2 = Math.min(CHART_RIGHT, xScale(toTime(p.end)))
    return { ...p, x1, x2 }
  })

  const handlePointer = (
    kind: 'event' | 'arr' | 'val',
    e: React.PointerEvent,
    payload: { event?: TimelineEvent; point?: DataPoint }
  ) => {
    setHover({
      x: e.clientX,
      y: e.clientY,
      kind,
      event: payload.event,
      point: payload.point,
    })
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
      onPointerLeave={() => setHover(null)}
    >
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          color: 'var(--ink-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 28,
          paddingBottom: 18,
          borderBottom: '1px solid var(--rule)',
          alignItems: 'center',
        }}
      >
        {LANE_BANDS.filter(b => typesUsed.has(b.type)).map(b => (
          <span key={b.type} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: TYPE_COLOR[b.type],
                display: 'inline-block',
              }}
            />
            {TYPE_LABEL[b.type]}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              border: '1.5px solid var(--ink)',
              background: 'var(--bg-elev)',
              boxSizing: 'border-box',
              display: 'inline-block',
            }}
          />
          Click for deep dive
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 2, background: ARR_COLOR }} />
            ARR
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 2, background: VAL_COLOR }} />
            Valuation
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VBOX_W} ${VBOX_H}`}
        style={{ width: '100%', height: 'auto', display: 'block', minWidth: 920 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Phase background shading (full chart height) */}
        {phaseRects.map((p, i) => (
          <rect
            key={`phase-${i}`}
            x={p.x1}
            y={CHART_TOP}
            width={p.x2 - p.x1}
            height={CHART_H}
            fill={p.color}
            opacity={0.5}
          />
        ))}

        {/* Phase labels at top */}
        {phaseRects.map((p, i) => (
          <text
            key={`phase-label-${i}`}
            x={(p.x1 + p.x2) / 2}
            y={CHART_TOP - 12}
            textAnchor="middle"
            fontSize={10.5}
            fontFamily="var(--mono)"
            fill="rgba(20,17,13,0.5)"
            style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}
          >
            {p.name}
          </text>
        ))}

        {/* Lane background tints — subtle horizontal stripes by type */}
        {LANE_BANDS.filter(b => typesUsed.has(b.type)).map(b => {
          const yTop = yArr(b.arrMax)
          const yBot = yArr(b.arrMin)
          return (
            <rect
              key={`lane-bg-${b.type}`}
              x={CHART_LEFT}
              y={yTop}
              width={CHART_W}
              height={yBot - yTop}
              fill={TYPE_COLOR[b.type]}
              opacity={0.025}
            />
          )
        })}

        {/* Lane horizontal center guide lines (faint) */}
        {LANE_BANDS.filter(b => typesUsed.has(b.type)).map(b => {
          const y = yArr((b.arrMin + b.arrMax) / 2)
          return (
            <line
              key={`lane-guide-${b.type}`}
              x1={CHART_LEFT}
              x2={CHART_RIGHT}
              y1={y}
              y2={y}
              stroke={TYPE_COLOR[b.type]}
              strokeWidth={0.6}
              opacity={0.18}
              strokeDasharray="2 5"
            />
          )
        })}

        {/* Y-axis grid */}
        {arrTicks.slice(1).map(v => (
          <line
            key={`grid-${v}`}
            x1={CHART_LEFT}
            x2={CHART_RIGHT}
            y1={yArr(v)}
            y2={yArr(v)}
            stroke="rgba(20,17,13,0.05)"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels (ARR left) */}
        {arrTicks.map(v => (
          <text
            key={`arr-tick-${v}`}
            x={CHART_LEFT - 14}
            y={yArr(v) + 4}
            textAnchor="end"
            fontSize={11}
            fontFamily="var(--mono)"
            fill="rgba(20,17,13,0.45)"
          >
            {v === 0 ? '0' : formatMoney(v)}
          </text>
        ))}
        <text
          x={CHART_LEFT - 14}
          y={CHART_TOP - 24}
          textAnchor="end"
          fontSize={10}
          fontFamily="var(--mono)"
          fontWeight={700}
          fill={ARR_COLOR}
          style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}
        >
          ARR
        </text>

        {/* Y-axis labels (Valuation right) */}
        {valTicks.map(v => (
          <text
            key={`val-tick-${v}`}
            x={CHART_RIGHT + 14}
            y={yVal(v) + 4}
            textAnchor="start"
            fontSize={11}
            fontFamily="var(--mono)"
            fill="rgba(232,78,27,0.65)"
          >
            {v === 0 ? '' : formatMoney(v)}
          </text>
        ))}
        <text
          x={CHART_RIGHT + 14}
          y={CHART_TOP - 24}
          textAnchor="start"
          fontSize={10}
          fontFamily="var(--mono)"
          fontWeight={700}
          fill={VAL_COLOR}
          style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}
        >
          Valuation
        </text>

        {/* X-axis line */}
        <line
          x1={CHART_LEFT}
          x2={CHART_RIGHT}
          y1={CHART_BOTTOM}
          y2={CHART_BOTTOM}
          stroke="rgba(20,17,13,0.20)"
          strokeWidth={1}
        />

        {/* X-axis ticks */}
        {xTicks.map(t => {
          const x = xScale(t.t)
          if (x < CHART_LEFT || x > CHART_RIGHT) return null
          return (
            <g key={`x-${t.t}-${t.label}`}>
              <line
                x1={x}
                x2={x}
                y1={CHART_BOTTOM}
                y2={CHART_BOTTOM + (t.major ? 8 : 4)}
                stroke="rgba(20,17,13,0.20)"
                strokeWidth={1}
              />
              {t.major && t.label && (
                <text
                  x={x}
                  y={CHART_BOTTOM + 28}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="var(--serif)"
                  fontStyle="italic"
                  fill="rgba(20,17,13,0.55)"
                >
                  {t.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Vertical guide lines for events with deep dive */}
        {laidOutEvents.map(e => {
          if (!e.articleSlug) return null
          const x = xScale(toTime(e.date))
          return (
            <line
              key={`guide-${e.date}-${e.title}`}
              x1={x}
              x2={x}
              y1={CHART_TOP}
              y2={CHART_BOTTOM}
              stroke={TYPE_COLOR[e.type]}
              strokeWidth={1}
              strokeDasharray="2 5"
              opacity={0.15}
            />
          )
        })}

        {/* ARR area fill */}
        <path
          d={`${arrPath} L ${xScale(toTime(timeline.arr[timeline.arr.length - 1].date))} ${CHART_BOTTOM} L ${xScale(toTime(timeline.arr[0].date))} ${CHART_BOTTOM} Z`}
          fill={ARR_COLOR}
          opacity={0.04}
        />

        {/* Curves */}
        <path
          d={arrPath}
          fill="none"
          stroke={ARR_COLOR}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={valPath}
          fill="none"
          stroke={VAL_COLOR}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0"
        />

        {/* ARR data points */}
        {timeline.arr.map(p => {
          const x = xScale(toTime(p.date))
          const y = yArr(p.value)
          const isHovered = hover?.kind === 'arr' && hover.point?.date === p.date
          return (
            <g key={`arr-pt-${p.date}`}>
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 5}
                fill={ARR_COLOR}
                stroke="white"
                strokeWidth={2.5}
                style={{ cursor: 'help', transition: 'r 0.15s' }}
                onPointerEnter={e => handlePointer('arr', e, { point: p })}
                onPointerMove={e => handlePointer('arr', e, { point: p })}
              />
              <text
                x={x + 8}
                y={y - 8}
                textAnchor="start"
                fontSize={11}
                fontFamily="var(--mono)"
                fontWeight={700}
                fill={ARR_COLOR}
                style={{ pointerEvents: 'none' }}
              >
                {formatMoney(p.value)}
              </text>
            </g>
          )
        })}

        {/* Valuation data points */}
        {timeline.valuation.map(p => {
          const x = xScale(toTime(p.date))
          const y = yVal(p.value)
          const isHovered = hover?.kind === 'val' && hover.point?.date === p.date
          return (
            <g key={`val-pt-${p.date}`}>
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 5}
                fill={VAL_COLOR}
                stroke="white"
                strokeWidth={2.5}
                style={{ cursor: 'help', transition: 'r 0.15s' }}
                onPointerEnter={e => handlePointer('val', e, { point: p })}
                onPointerMove={e => handlePointer('val', e, { point: p })}
              />
              <text
                x={x - 8}
                y={y - 8}
                textAnchor="end"
                fontSize={11}
                fontFamily="var(--mono)"
                fontWeight={700}
                fill={VAL_COLOR}
                style={{ pointerEvents: 'none' }}
              >
                {formatMoney(p.value)}
              </text>
            </g>
          )
        })}

        {/* Event markers — distributed in their type's Y band */}
        {laidOutEvents.map(e => {
          const x = xScale(toTime(e.date))
          const yBase = e.y
          const color = TYPE_COLOR[e.type]
          const hasArticle = !!e.articleSlug
          const hasExternal = !!e.externalUrl
          const hasLink = hasArticle || hasExternal
          const isImportant = !!e.gtmTag || hasArticle
          const isHovered =
            hover?.kind === 'event' &&
            hover.event?.date === e.date &&
            hover.event?.title === e.title

          // Alternate within lane: even idx → label above, odd idx → label below
          const labelAbove = e.inLane % 2 === 0
          const yMarkerOffset = labelAbove ? -10 : 10
          const yMarker = yBase + yMarkerOffset
          const yLabel = labelAbove ? yMarker - 10 : yMarker + 16

          const baseR = hasArticle ? 6 : isImportant ? 5 : 4
          const r = isHovered ? baseR + 2 : baseR

          const titleText = truncate(e.title, 26)

          const markerInner = (
            <>
              {hasArticle && (
                <circle
                  cx={x}
                  cy={yMarker}
                  r={isHovered ? 11 : 9.5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.2}
                  opacity={0.5}
                  style={{ transition: 'r 0.15s' }}
                />
              )}
              <circle
                cx={x}
                cy={yMarker}
                r={r}
                fill={hasLink ? color : 'white'}
                stroke={color}
                strokeWidth={hasLink ? 2 : 1.5}
                style={{ transition: 'r 0.15s' }}
              />
              <line
                x1={x}
                x2={x}
                y1={yMarker + (labelAbove ? -baseR - 1 : baseR + 1)}
                y2={yLabel + (labelAbove ? 4 : -8)}
                stroke={color}
                strokeWidth={0.8}
                opacity={0.45}
              />
              <text
                x={x + 5}
                y={yLabel}
                textAnchor="start"
                fontSize={isImportant ? 11.5 : 10.5}
                fontFamily="var(--sans)"
                fontWeight={isImportant ? 600 : 500}
                fill={color}
                opacity={isImportant ? 1 : 0.85}
                style={{ pointerEvents: 'none' }}
              >
                <tspan
                  style={{
                    paintOrder: 'stroke',
                    stroke: 'rgba(250,250,247,0.9)',
                    strokeWidth: 3,
                  }}
                >
                  {titleText}
                </tspan>
                {hasArticle && (
                  <tspan fill={color} fontWeight={700}>
                    {' →'}
                  </tspan>
                )}
                {hasExternal && !hasArticle && (
                  <tspan fill={color} opacity={0.7}>
                    {' ↗'}
                  </tspan>
                )}
              </text>
            </>
          )

          const handlers = {
            onPointerEnter: (ev: React.PointerEvent) => handlePointer('event', ev, { event: e }),
            onPointerMove: (ev: React.PointerEvent) => handlePointer('event', ev, { event: e }),
          }

          if (hasArticle) {
            return (
              <Link
                key={`evt-${e.date}-${e.title}`}
                href={`/growth-story/${company}/${e.articleSlug}`}
                style={{ cursor: 'pointer' }}
              >
                <g {...handlers}>{markerInner}</g>
              </Link>
            )
          }
          if (hasExternal) {
            return (
              <a
                key={`evt-${e.date}-${e.title}`}
                href={e.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ cursor: 'pointer' }}
              >
                <g {...handlers}>{markerInner}</g>
              </a>
            )
          }
          return (
            <g key={`evt-${e.date}-${e.title}`} {...handlers} style={{ cursor: 'help' }}>
              {markerInner}
            </g>
          )
        })}

        {/* Lane labels (left side, on top of everything) */}
        {LANE_BANDS.filter(b => typesUsed.has(b.type)).map(b => {
          const y = yArr((b.arrMin + b.arrMax) / 2)
          return (
            <g key={`lane-label-${b.type}`}>
              <rect
                x={2}
                y={y - 12}
                width={CHART_LEFT - 6}
                height={24}
                fill="var(--bg)"
                opacity={0.92}
                rx={2}
              />
              <text
                x={6}
                y={y + 5}
                textAnchor="start"
                fontSize={13}
                fontFamily="var(--serif)"
                fontStyle="italic"
                fill={TYPE_COLOR[b.type]}
              >
                {TYPE_LABEL[b.type]}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hover && (
        <div
          style={{
            position: 'fixed',
            left: hover.x + 14,
            top: hover.y + 14,
            zIndex: 100,
            background: 'var(--bg-elev)',
            border: '1px solid var(--rule-strong)',
            borderRadius: 8,
            padding: '14px 16px',
            maxWidth: 340,
            boxShadow: '0 14px 36px rgba(20,17,13,0.14)',
            pointerEvents: 'none',
            fontSize: 13,
          }}
        >
          {hover.kind === 'event' && hover.event && (
            <>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: TYPE_COLOR[hover.event.type],
                  marginBottom: 6,
                }}
              >
                {formatDateLong(hover.event.date)} · {TYPE_LABEL[hover.event.type]}
              </div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontWeight: 400,
                  fontSize: 19,
                  color: 'var(--ink)',
                  marginBottom: 6,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                {hover.event.title}
              </div>
              {hover.event.gtmTag && (
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: TYPE_COLOR[hover.event.type],
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  [ {hover.event.gtmTag} ]
                </div>
              )}
              <div style={{ color: 'var(--ink-dim)', lineHeight: 1.55, fontSize: 13 }}>
                {hover.event.description}
              </div>
              {(hover.event.articleSlug || hover.event.externalUrl) && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--rule)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {hover.event.articleSlug ? 'Read deep dive →' : 'View source ↗'}
                </div>
              )}
            </>
          )}
          {hover.kind === 'arr' && hover.point && (
            <>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: ARR_COLOR,
                  marginBottom: 4,
                }}
              >
                {formatDateShort(hover.point.date)} · ARR
              </div>
              <div
                style={{
                  fontWeight: 400,
                  fontSize: 28,
                  color: 'var(--ink)',
                  marginBottom: 8,
                  fontFamily: 'var(--serif)',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(hover.point.value)}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
                {hover.point.confidence === 'official'
                  ? 'Official'
                  : hover.point.confidence === 'media'
                    ? 'Media'
                    : 'Estimate'}
                {' · '}
                {hover.point.source}
              </div>
            </>
          )}
          {hover.kind === 'val' && hover.point && (
            <>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: VAL_COLOR,
                  marginBottom: 4,
                }}
              >
                {formatDateShort(hover.point.date)} · {hover.point.round}
              </div>
              <div
                style={{
                  fontWeight: 400,
                  fontSize: 28,
                  color: 'var(--ink)',
                  marginBottom: 8,
                  fontFamily: 'var(--serif)',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(hover.point.value)}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
                {hover.point.confidence === 'official'
                  ? 'Official'
                  : hover.point.confidence === 'media'
                    ? 'Media'
                    : 'Estimate'}
                {' · '}
                {hover.point.source}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

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

const ARR_COLOR = '#14110d'
const VAL_COLOR = '#e84e1b'

const VBOX_W = 1320
const VBOX_H = 880
const PAD = { top: 50, right: 80, bottom: 60, left: 110 }
const EVT_BAND_TOP = PAD.top
const LANE_H = 56
const LANE_ORDER: EventType[] = ['product', 'funding', 'media', 'acquisition']
const EVT_BAND_H = LANE_H * LANE_ORDER.length + 30
const CHART_TOP = PAD.top + EVT_BAND_H + 30
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

  const arrMax = Math.max(...timeline.arr.map(p => p.value)) * 1.12
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
  }, [arrMax])

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
      ticks.push({ t: toTime(`${y}-07-01`), label: `${y}.07`, major: false })
    }
    return ticks
  }, [])

  // Distribute events into type-specific lanes; track in-lane index for label alternation
  const laidOutEvents = useMemo(() => {
    const sorted = [...timeline.events].sort((a, b) => toTime(a.date) - toTime(b.date))
    const counters: Record<EventType, number> = { product: 0, funding: 0, media: 0, acquisition: 0 }
    return sorted.map(e => {
      const laneIdx = LANE_ORDER.indexOf(e.type)
      const inLane = counters[e.type]++
      return { ...e, laneIdx, inLane }
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
          gap: 20,
          flexWrap: 'wrap',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid var(--rule)',
          alignItems: 'center',
        }}
      >
        {LANE_ORDER.filter(t => typesUsed.has(t)).map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: TYPE_COLOR[t],
                display: 'inline-block',
              }}
            />
            {TYPE_LABEL[t]}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid var(--ink)',
              background: 'var(--bg-elev)',
              boxSizing: 'border-box',
              display: 'inline-block',
            }}
          />
          Click for deep dive
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 14 }}>
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
        style={{ width: '100%', height: 'auto', display: 'block', minWidth: 900 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Lane backgrounds (very subtle alternating) */}
        {LANE_ORDER.filter(t => typesUsed.has(t)).map(type => {
          const idx = LANE_ORDER.indexOf(type)
          const y = EVT_BAND_TOP + 24 + idx * LANE_H
          return (
            <rect
              key={`lane-bg-${type}`}
              x={PAD.left - 70}
              y={y - LANE_H / 2 + 4}
              width={VBOX_W - PAD.left - PAD.right + 70}
              height={LANE_H - 8}
              fill={TYPE_COLOR[type]}
              opacity={0.025}
            />
          )
        })}

        {/* Lane labels (left side of event band) */}
        {LANE_ORDER.filter(t => typesUsed.has(t)).map(type => {
          const idx = LANE_ORDER.indexOf(type)
          const y = EVT_BAND_TOP + 24 + idx * LANE_H
          return (
            <text
              key={`lane-label-${type}`}
              x={6}
              y={y + 4}
              textAnchor="start"
              fontSize={11}
              fontFamily="var(--mono)"
              fontWeight={700}
              fill={TYPE_COLOR[type]}
              style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
            >
              {TYPE_LABEL[type]}
            </text>
          )
        })}

        {/* Lane horizontal guide lines */}
        {LANE_ORDER.filter(t => typesUsed.has(t)).map(type => {
          const idx = LANE_ORDER.indexOf(type)
          const y = EVT_BAND_TOP + 24 + idx * LANE_H
          return (
            <line
              key={`lane-line-${type}`}
              x1={PAD.left - 30}
              x2={CHART_RIGHT}
              y1={y}
              y2={y}
              stroke={TYPE_COLOR[type]}
              strokeWidth={0.7}
              opacity={0.18}
              strokeDasharray="2 4"
            />
          )
        })}

        {/* Phase background shading (chart area only) */}
        {phaseRects.map((p, i) => (
          <g key={`phase-${i}`}>
            <rect
              x={p.x1}
              y={CHART_TOP}
              width={p.x2 - p.x1}
              height={CHART_H}
              fill={p.color}
              opacity={0.4}
            />
            <text
              x={(p.x1 + p.x2) / 2}
              y={CHART_TOP + 18}
              textAnchor="middle"
              fontSize={11}
              fontFamily="var(--mono)"
              fill="rgba(20,17,13,0.45)"
              style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
            >
              {p.name}
            </text>
          </g>
        ))}

        {/* Y-axis grid */}
        {arrTicks.slice(1).map(v => (
          <line
            key={`grid-${v}`}
            x1={CHART_LEFT}
            x2={CHART_RIGHT}
            y1={yArr(v)}
            y2={yArr(v)}
            stroke="rgba(20,17,13,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels (ARR left) */}
        {arrTicks.map(v => (
          <text
            key={`arr-tick-${v}`}
            x={CHART_LEFT - 12}
            y={yArr(v) + 4}
            textAnchor="end"
            fontSize={11}
            fontFamily="var(--mono)"
            fill="rgba(20,17,13,0.55)"
          >
            {v === 0 ? '0' : formatMoney(v)}
          </text>
        ))}
        <text
          x={CHART_LEFT - 12}
          y={CHART_TOP - 18}
          textAnchor="end"
          fontSize={10}
          fontFamily="var(--mono)"
          fontWeight={700}
          fill={ARR_COLOR}
          style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
        >
          ARR
        </text>

        {/* Y-axis labels (Valuation right) */}
        {valTicks.map(v => (
          <text
            key={`val-tick-${v}`}
            x={CHART_RIGHT + 12}
            y={yVal(v) + 4}
            textAnchor="start"
            fontSize={11}
            fontFamily="var(--mono)"
            fill="rgba(232,78,27,0.7)"
          >
            {v === 0 ? '' : formatMoney(v)}
          </text>
        ))}
        <text
          x={CHART_RIGHT + 12}
          y={CHART_TOP - 18}
          textAnchor="start"
          fontSize={10}
          fontFamily="var(--mono)"
          fontWeight={700}
          fill={VAL_COLOR}
          style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
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
            <g key={t.label}>
              <line
                x1={x}
                x2={x}
                y1={CHART_BOTTOM}
                y2={CHART_BOTTOM + (t.major ? 8 : 4)}
                stroke="rgba(20,17,13,0.20)"
                strokeWidth={1}
              />
              {t.major && (
                <text
                  x={x}
                  y={CHART_BOTTOM + 26}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="var(--mono)"
                  fill="rgba(20,17,13,0.55)"
                >
                  {t.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Vertical guide lines from events with deep dive into chart */}
        {laidOutEvents.map(e => {
          if (!e.articleSlug) return null
          const x = xScale(toTime(e.date))
          const yFrom = EVT_BAND_TOP + 24 + e.laneIdx * LANE_H
          return (
            <line
              key={`guide-${e.date}-${e.title}`}
              x1={x}
              x2={x}
              y1={yFrom + 8}
              y2={CHART_BOTTOM}
              stroke={TYPE_COLOR[e.type]}
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.22}
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
        <path d={arrPath} fill="none" stroke={ARR_COLOR} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d={valPath} fill="none" stroke={VAL_COLOR} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

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
                strokeWidth={2}
                style={{ cursor: 'help', transition: 'r 0.15s' }}
                onPointerEnter={e => handlePointer('arr', e, { point: p })}
                onPointerMove={e => handlePointer('arr', e, { point: p })}
              />
              <text
                x={x}
                y={y - 14}
                textAnchor="middle"
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
                strokeWidth={2}
                style={{ cursor: 'help', transition: 'r 0.15s' }}
                onPointerEnter={e => handlePointer('val', e, { point: p })}
                onPointerMove={e => handlePointer('val', e, { point: p })}
              />
              <text
                x={x}
                y={y - 14}
                textAnchor="middle"
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

        {/* Event markers (all 22, lane-distributed, all labeled) */}
        {laidOutEvents.map(e => {
          const x = xScale(toTime(e.date))
          const y = EVT_BAND_TOP + 24 + e.laneIdx * LANE_H
          const color = TYPE_COLOR[e.type]
          const hasArticle = !!e.articleSlug
          const hasExternal = !!e.externalUrl
          const hasLink = hasArticle || hasExternal
          const isImportant = !!e.gtmTag || hasArticle
          const isHovered =
            hover?.kind === 'event' &&
            hover.event?.date === e.date &&
            hover.event?.title === e.title

          // Alternate label position above/below within lane
          const labelAbove = e.inLane % 2 === 0
          const yLabel = labelAbove ? y - 9 : y + 16

          // Marker sizing by importance
          const baseR = hasArticle ? 6 : isImportant ? 5 : 4
          const r = isHovered ? baseR + 2 : baseR

          // Truncated label
          const titleText = truncate(e.title, 24)

          const markerInner = (
            <>
              {/* Outer ring for events with deep dive */}
              {hasArticle && (
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 11 : 9}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.2}
                  opacity={0.45}
                  style={{ transition: 'r 0.15s' }}
                />
              )}
              {/* Marker */}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={hasLink ? color : 'white'}
                stroke={color}
                strokeWidth={hasLink ? 2 : 1.5}
                style={{ transition: 'r 0.15s' }}
              />
              {/* Connector line marker → label */}
              <line
                x1={x}
                x2={x}
                y1={y + (labelAbove ? -baseR - 1 : baseR + 1)}
                y2={yLabel + (labelAbove ? 4 : -8)}
                stroke={color}
                strokeWidth={0.7}
                opacity={0.4}
              />
              {/* Label */}
              <text
                x={x + 4}
                y={yLabel}
                textAnchor="start"
                fontSize={isImportant ? 11 : 10}
                fontFamily="var(--sans)"
                fontWeight={isImportant ? 600 : 500}
                fill={color}
                opacity={isImportant ? 1 : 0.85}
                style={{ pointerEvents: 'none' }}
              >
                {titleText}
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
            padding: '12px 14px',
            maxWidth: 320,
            boxShadow: '0 12px 30px rgba(20,17,13,0.12)',
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
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: TYPE_COLOR[hover.event.type],
                  marginBottom: 4,
                }}
              >
                {formatDateLong(hover.event.date)} · {TYPE_LABEL[hover.event.type]}
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--ink)',
                  marginBottom: 4,
                  lineHeight: 1.3,
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
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  [{hover.event.gtmTag}]
                </div>
              )}
              <div style={{ color: 'var(--ink-dim)', lineHeight: 1.5, fontSize: 12.5 }}>
                {hover.event.description}
              </div>
              {(hover.event.articleSlug || hover.event.externalUrl) && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: '1px solid var(--rule)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
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
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: ARR_COLOR,
                  marginBottom: 4,
                }}
              >
                {formatDateShort(hover.point.date)} · ARR
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 22,
                  color: 'var(--ink)',
                  marginBottom: 6,
                  fontFamily: 'var(--serif)',
                  letterSpacing: '-0.01em',
                }}
              >
                {formatMoney(hover.point.value)}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                }}
              >
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
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: VAL_COLOR,
                  marginBottom: 4,
                }}
              >
                {formatDateShort(hover.point.date)} · {hover.point.round}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 22,
                  color: 'var(--ink)',
                  marginBottom: 6,
                  fontFamily: 'var(--serif)',
                  letterSpacing: '-0.01em',
                }}
              >
                {formatMoney(hover.point.value)}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                }}
              >
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

'use client'

import { useState } from 'react'
import type { AuditResult, CheckStatus } from '@/lib/audit/types'

const GLYPH: Record<CheckStatus, string> = { pass: '✓', partial: '◐', fail: '✕', na: '–' }
const COLOR: Record<CheckStatus, string> = {
  pass: '#16a34a',
  partial: 'var(--warn)',
  fail: '#c0392b',
  na: 'var(--ink-faint)',
}

function barColor(percent: number): string {
  if (percent >= 70) return '#16a34a'
  if (percent >= 45) return 'var(--warn)'
  return '#c0392b'
}

/** Expandable 8-dimension / ~42-check breakdown. */
export function ResultChecklist({ dimensions }: { dimensions: AuditResult['dimensions'] }) {
  const [open, setOpen] = useState<string | null>(dimensions[0]?.id ?? null)

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elev)' }}>
      {dimensions.map((dim) => {
        const isOpen = open === dim.id
        return (
          <div key={dim.id} style={{ borderBottom: '1px solid var(--rule)' }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : dim.id)}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 140px 56px 20px',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {dim.label}
                <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
                  {dim.weight}%
                </span>
              </span>
              <span style={{ height: 6, borderRadius: 3, background: 'var(--bg-card)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${dim.percent}%`, background: barColor(dim.percent) }} />
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>
                {dim.percent}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                ▸
              </span>
            </button>

            {isOpen && (
              <div style={{ padding: '4px 20px 16px', background: 'var(--bg-card)' }}>
                {dim.checks.map((check) => (
                  <div
                    key={check.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 0',
                      borderTop: '1px solid var(--rule)',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: COLOR[check.status], fontWeight: 700, flexShrink: 0, width: 14 }}>
                      {GLYPH[check.status]}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{check.label}</div>
                      {check.detail && (
                        <div style={{ color: 'var(--ink-dim)', marginTop: 2, lineHeight: 1.5 }}>{check.detail}</div>
                      )}
                      {check.fix && check.status !== 'pass' && check.status !== 'na' && (
                        <div style={{ color: 'var(--accent)', marginTop: 4, lineHeight: 1.5 }}>
                          → {check.fix}
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>
                      {check.status === 'na' ? 'n/a' : `${check.score}/${check.max}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

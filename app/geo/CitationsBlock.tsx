'use client'

import { useState } from 'react'
import type { CitationRun, EngineId } from '@/lib/citations/types'

const ENGINE_LABEL: Record<EngineId, string> = {
  perplexity: 'Perplexity',
  openai: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}
const ENGINE_ORDER: EngineId[] = ['perplexity', 'openai', 'gemini', 'claude']

type Phase = 'idle' | 'loading' | 'done' | 'error' | 'limit'

function rateColor(r: number): string {
  if (r >= 0.7) return '#16a34a'
  if (r >= 0.35) return 'var(--warn)'
  return '#c0392b'
}

interface CellProps {
  available: boolean
  cited: boolean
  error?: string
}
function Cell({ available, cited, error }: CellProps) {
  if (!available) {
    return (
      <td style={{ padding: 0 }}>
        <div title="API key not configured — set the engine's key in env to enable"
             style={{ background: 'var(--bg-card)', color: 'var(--ink-faint)', textAlign: 'center', padding: '12px 8px', fontSize: 12, fontFamily: 'var(--mono)' }}>
          —
        </div>
      </td>
    )
  }
  if (error) {
    return (
      <td style={{ padding: 0 }}>
        <div title={`Engine error: ${error}`}
             style={{ background: '#fef2f2', color: '#c0392b', textAlign: 'center', padding: '12px 8px', fontSize: 11, fontFamily: 'var(--mono)' }}>
          ERR
        </div>
      </td>
    )
  }
  return (
    <td style={{ padding: 0 }}>
      <div title={cited ? 'Cited' : 'Not cited'}
           style={{ background: cited ? '#dcfce7' : '#fef2f2', color: cited ? '#15803d' : '#c0392b', textAlign: 'center', padding: '12px 8px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)' }}>
        {cited ? '●' : '○'}
      </div>
    </td>
  )
}

/**
 * Live AI citation check — fires after the user already has an audit result,
 * so we already know the URL is fetchable. Sits at the bottom of AuditReport.
 */
export function CitationsBlock({ url }: { url: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [run, setRun] = useState<CitationRun | null>(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  async function start(withEmail?: string) {
    setPhase('loading')
    setError('')
    try {
      const res = await fetch('/api/geo/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email: withEmail }),
      })
      const data = await res.json()
      if (res.status === 429 || data.error === 'limit') {
        setPhase('limit')
        return
      }
      if (!res.ok || !data.run) {
        setError(data.error || 'Citation check failed.')
        setPhase('error')
        return
      }
      setRun(data.run as CitationRun)
      setPhase('done')
    } catch {
      setError('Network error — please try again.')
      setPhase('error')
    }
  }

  if (phase === 'idle') {
    return (
      <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 12, padding: '24px 26px', background: 'var(--bg-elev)' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Live AI citation check · beta</div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: '0 0 8px' }}>
          See which AI engines actually cite you
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 18px', lineHeight: 1.6, maxWidth: 580 }}>
          We&apos;ll ask Perplexity, ChatGPT, Gemini and Claude six relevant questions and
          check whether <strong>{new URL(url).hostname.replace(/^www\./, '')}</strong> appears
          in the source list each one returns. Takes ~30&nbsp;seconds. 1 free check/day.
        </p>
        <button
          type="button"
          onClick={() => start()}
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Run live citation check →
        </button>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '24px 26px', background: 'var(--bg-elev)' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Running citation check</div>
        <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.6 }}>
          Generating questions, then hitting each AI engine with web search. Usually 20–40 seconds.
        </p>
      </div>
    )
  }

  if (phase === 'limit') {
    return (
      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '24px 26px', background: 'var(--bg-card)' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: '0 0 8px' }}>
          Daily citation check limit reached
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 14px', lineHeight: 1.6 }}>
          Citation checks are pricey (real LLM calls). Drop an email to unlock 5 per day.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (email.trim()) start(email.trim().toLowerCase()) }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 460 }}
        >
          <input
            type="email"
            required
            placeholder="you@yourproduct.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: '1 1 240px', background: 'var(--bg-elev)', border: '1.5px solid var(--rule-strong)', borderRadius: 999, padding: '12px 20px', fontSize: 14, color: 'var(--ink)' }}
          />
          <button type="submit" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Unlock &amp; run →
          </button>
        </form>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: '16px 20px', fontSize: 14, color: '#c0392b' }}>
        {error}
      </div>
    )
  }

  // phase === 'done'
  if (!run) return null
  const rate = run.summary.overallRate
  const activeEngines = ENGINE_ORDER.filter((e) => run.results.some((r) => r.engine === e && r.available))
  const cellLookup = new Map<string, typeof run.results[0]>()
  for (const r of run.results) cellLookup.set(`${r.query}|${r.engine}`, r)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="eyebrow"><span className="dot" />Live AI citation results</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 16, alignItems: 'center', border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 22px', background: 'var(--bg-elev)' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--mono)' }}>
            Overall citation rate
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1, color: rateColor(rate) }}>
              {Math.round(rate * 100)}%
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-faint)' }}>
              {run.summary.overallCitedCells} / {run.summary.overallTotalCells} cells cited
            </span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.55 }}>
            Across {run.queries.length} queries × {run.summary.availableEngines} engines (the rest are skipped — API keys not configured).
          </p>
        </div>
      </div>

      {activeEngines.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule-strong)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: 'var(--ink-dim)' }}>
          No AI engine API keys are configured. Set <code>PERPLEXITY_API_KEY</code>, <code>OPENAI_API_KEY</code>,
          <code> GEMINI_API_KEY</code>, or <code>ANTHROPIC_API_KEY</code> to enable real citation checks.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elev)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                  Query
                </th>
                {ENGINE_ORDER.map((e) => (
                  <th key={e} style={{ width: 88, padding: '12px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                    {ENGINE_LABEL[e]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {run.queries.map((q) => (
                <tr key={q} style={{ borderTop: '1px solid var(--rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--ink)' }}>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{q}</div>
                  </td>
                  {ENGINE_ORDER.map((e) => {
                    const r = cellLookup.get(`${q}|${e}`)
                    return <Cell key={e} available={r?.available ?? false} cited={r?.cited ?? false} error={r?.error} />
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0, lineHeight: 1.55 }}>
        ● cited · ○ not cited · — engine skipped (no API key) · ERR engine error. The check is point-in-time;
        results change as engines re-index the web.
      </p>
    </div>
  )
}

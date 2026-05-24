'use client'

import { useState, type FormEvent } from 'react'

type Phase = 'idle' | 'submitting' | 'done' | 'error'

const EMAIL_KEY = 'gh-geo-email'

/** "Track this URL" form: subscribes (email, url) to weekly re-audits. */
export function TrackBlock({ url, initialScore }: { url: string; initialScore: number }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(EMAIL_KEY) || ''
  })
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setPhase('submitting')
    setError('')
    try {
      const res = await fetch('/api/geo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not track this URL.')
        setPhase('error')
        return
      }
      if (typeof window !== 'undefined') localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase())
      setPhase('done')
    } catch {
      setError('Network error — please try again.')
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: '20px 24px' }}>
        <div className="eyebrow" style={{ marginBottom: 6, color: '#15803d' }}>
          <span className="dot" style={{ background: '#16a34a' }} />Tracking on
        </div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: '0 0 6px', color: '#14532d' }}>
          We&apos;ll re-audit weekly and email you the diff
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: '#166534', lineHeight: 1.55 }}>
          Baseline score: <strong>{initialScore}/100</strong>. You&apos;ll only hear from us if the
          score moves by ≥3 points or a new issue surfaces.
        </p>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '24px 26px', background: 'var(--bg-elev)' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Weekly monitoring</div>
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: '0 0 8px' }}>
        Track this URL for free
      </h3>
      <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 16px', lineHeight: 1.6, maxWidth: 580 }}>
        We&apos;ll re-audit weekly and email you only when the score moves meaningfully or a new
        priority issue appears. No spam, unsubscribe anytime.
      </p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 460 }}>
        <input
          type="email"
          required
          placeholder="you@yourproduct.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: '1 1 240px', background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', borderRadius: 999, padding: '12px 20px', fontSize: 14, color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={phase === 'submitting'}
          style={{ background: phase === 'submitting' ? 'var(--ink-faint)' : 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: phase === 'submitting' ? 'not-allowed' : 'pointer' }}
        >
          {phase === 'submitting' ? 'Tracking…' : 'Track this URL →'}
        </button>
      </form>
      {phase === 'error' && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b' }}>{error}</p>
      )}
    </div>
  )
}

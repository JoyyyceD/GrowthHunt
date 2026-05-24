'use client'

import { useState, type FormEvent } from 'react'
import type { AuditResult } from '@/lib/audit'
import { CompeteMatrix } from './CompeteMatrix'

interface AuditEntry {
  url: string
  role: 'primary' | 'competitor'
  ok: boolean
  result: AuditResult | null
  error: string | null
}

type Phase = 'idle' | 'loading' | 'done' | 'error' | 'limit'

const EMAIL_KEY = 'gh-geo-email'

export function CompeteForm() {
  const [primary, setPrimary] = useState('')
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [c3, setC3] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [audits, setAudits] = useState<AuditEntry[]>([])
  const [error, setError] = useState('')
  const [email, setEmail] = useState(() => (typeof window === 'undefined' ? '' : localStorage.getItem(EMAIL_KEY) || ''))

  async function run(e: FormEvent, withEmail?: string) {
    e.preventDefault()
    const competitors = [c1, c2, c3].map((s) => s.trim()).filter(Boolean)
    if (!primary.trim() || competitors.length === 0) return

    setPhase('loading')
    setError('')
    try {
      const res = await fetch('/api/geo/compete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary: primary.trim(), competitors, email: withEmail }),
      })
      const data = await res.json()
      if (res.status === 429 || data.error === 'limit') { setPhase('limit'); return }
      if (!res.ok || !Array.isArray(data.audits)) {
        setError(data.error || 'Compete audit failed.')
        setPhase('error')
        return
      }
      setAudits(data.audits as AuditEntry[])
      setPhase('done')
    } catch {
      setError('Network error — please try again.')
      setPhase('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elev)',
    border: '1.5px solid var(--rule-strong)',
    borderRadius: 999,
    padding: '12px 22px',
    fontSize: 14.5,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
    width: '100%',
  }

  return (
    <div>
      <form onSubmit={(e) => run(e, email || undefined)} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
        <input
          type="text"
          inputMode="url"
          placeholder="your-product.com — your URL"
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
          style={inputStyle}
        />
        <input type="text" inputMode="url" placeholder="competitor-1.com" value={c1} onChange={(e) => setC1(e.target.value)} style={inputStyle} />
        <input type="text" inputMode="url" placeholder="competitor-2.com (optional)" value={c2} onChange={(e) => setC2(e.target.value)} style={inputStyle} />
        <input type="text" inputMode="url" placeholder="competitor-3.com (optional)" value={c3} onChange={(e) => setC3(e.target.value)} style={inputStyle} />
        <button
          type="submit"
          disabled={phase === 'loading'}
          style={{
            background: phase === 'loading' ? 'var(--ink-faint)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '14px 28px',
            fontSize: 14,
            fontWeight: 600,
            cursor: phase === 'loading' ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            alignSelf: 'flex-start',
          }}
        >
          {phase === 'loading' ? 'Auditing all URLs…' : 'Run side-by-side audit →'}
        </button>
      </form>

      <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '12px 0 0' }}>
        1 of you + up to 3 competitors · audits run in parallel, cached for 24h
      </p>

      {phase === 'loading' && (
        <div style={{ marginTop: 32, padding: '32px 24px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Running audits in parallel</div>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.6 }}>
            Fetching every URL, scoring 8 dimensions on each. About 15–25 seconds.
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ marginTop: 32, padding: '16px 20px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, fontSize: 14, color: '#c0392b' }}>
          {error}
        </div>
      )}

      {phase === 'limit' && (
        <div style={{ marginTop: 32, padding: '24px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-card)' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: '0 0 8px' }}>
            Daily compete limit reached
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 14px' }}>
            Drop an email to unlock 3 compete audits per day.
          </p>
          <form
            onSubmit={(e) => { if (email.trim()) { localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase()); run(e, email.trim().toLowerCase()) } else e.preventDefault() }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 460 }}
          >
            <input type="email" required placeholder="you@yourproduct.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, flex: '1 1 240px', width: 'auto' }} />
            <button type="submit" style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Unlock &amp; run →
            </button>
          </form>
        </div>
      )}

      {phase === 'done' && audits.length > 0 && (
        <div style={{ marginTop: 44 }}>
          <CompeteMatrix audits={audits} />
        </div>
      )}
    </div>
  )
}

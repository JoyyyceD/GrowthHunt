'use client'

import { useState, useEffect, type FormEvent } from 'react'
import type { AuditResult } from '@/lib/audit'
import { AuditReport } from './AuditReport'

type Phase = 'idle' | 'loading' | 'done' | 'error' | 'limit'

const EMAIL_KEY = 'gh-geo-email'

export function GeoAuditForm() {
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [cached, setCached] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [emailUnlockable, setEmailUnlockable] = useState(true)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(EMAIL_KEY) : null
    if (saved) setEmail(saved)
  }, [])

  async function audit(targetUrl: string, withEmail?: string) {
    setPhase('loading')
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, email: withEmail || undefined }),
      })
      const data = await res.json()
      if (res.status === 429 || data.error === 'limit') {
        setEmailUnlockable(data.emailUnlock !== false)
        setPhase('limit')
        return
      }
      if (!res.ok || !data.result) {
        setError(data.error || 'The audit failed. Please try again.')
        setPhase('error')
        return
      }
      setResult(data.result as AuditResult)
      setCached(Boolean(data.cached))
      setPhase('done')
    } catch {
      setError('Network error — please try again.')
      setPhase('error')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    audit(url.trim(), email || undefined)
  }

  function onUnlock(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !url.trim()) return
    localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase())
    audit(url.trim(), email.trim().toLowerCase())
  }

  return (
    <div>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 560 }}>
        <input
          type="text"
          inputMode="url"
          placeholder="yourproduct.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            flex: '1 1 280px',
            background: 'var(--bg-elev)',
            border: '1.5px solid var(--rule-strong)',
            borderRadius: 999,
            padding: '14px 22px',
            fontSize: 15,
            fontFamily: 'inherit',
            color: 'var(--ink)',
            outline: 'none',
            minWidth: 0,
          }}
        />
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
            whiteSpace: 'nowrap',
          }}
        >
          {phase === 'loading' ? 'Auditing…' : 'Audit my page →'}
        </button>
      </form>
      <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '14px 0 0' }}>
        Free · ~10 seconds · 3 audits/day · no account needed
      </p>

      {phase === 'loading' && (
        <div style={{ marginTop: 40, padding: '32px 24px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Running audit</div>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.6 }}>
            Fetching the page, scoring 8 dimensions across ~42 checks, and reviewing the
            opening copy with Claude. This usually takes about 10 seconds.
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ marginTop: 40, padding: '16px 20px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, fontSize: 14, color: '#c0392b' }}>
          {error}
        </div>
      )}

      {phase === 'limit' && (
        <div style={{ marginTop: 40, padding: '28px 24px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-card)' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: '0 0 8px' }}>
            You&apos;ve used your free audits for today
          </h3>
          {emailUnlockable ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 18px', lineHeight: 1.6 }}>
                Drop your email to unlock <strong style={{ color: 'var(--ink)' }}>10 audits a day</strong> — and
                we&apos;ll send you the indie-hacker GEO playbook.
              </p>
              <form onSubmit={onUnlock} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 460 }}>
                <input
                  type="email"
                  required
                  placeholder="you@yourproduct.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: '1 1 240px',
                    background: 'var(--bg-elev)',
                    border: '1.5px solid var(--rule-strong)',
                    borderRadius: 999,
                    padding: '12px 20px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: 'var(--ink)',
                    outline: 'none',
                    minWidth: 0,
                  }}
                />
                <button type="submit" style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Unlock &amp; audit →
                </button>
              </form>
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.6 }}>
              You&apos;ve hit today&apos;s limit. It resets at midnight UTC — or run unlimited
              audits from Claude Code with the GEO skill.
            </p>
          )}
        </div>
      )}

      {phase === 'done' && result && (
        <div style={{ marginTop: 44 }}>
          <AuditReport result={result} cached={cached} shareable />
        </div>
      )}
    </div>
  )
}

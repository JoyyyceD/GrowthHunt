'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { SiteHeatmap } from './SiteHeatmap'

type Phase = 'idle' | 'starting' | 'polling' | 'done' | 'error' | 'limit'

interface PageResult {
  url: string
  score: number | null
  dims: Record<string, number>
  status: 'ok' | 'limited' | 'error'
  error?: string
}
interface SiteAuditRow {
  id: string
  domain: string
  sitemap_url: string
  status: 'running' | 'done' | 'error'
  total_urls: number
  audited_urls: number
  pages: PageResult[]
  created_at: string
}

const EMAIL_KEY = 'gh-geo-email'
const POLL_MS = 4_000

export function SiteForm() {
  const [domain, setDomain] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [id, setId] = useState<string | null>(null)
  const [row, setRow] = useState<SiteAuditRow | null>(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState(() => (typeof window === 'undefined' ? '' : localStorage.getItem(EMAIL_KEY) || ''))

  // Poll progress while audit is running.
  useEffect(() => {
    if (phase !== 'polling' || !id) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    async function tick() {
      try {
        const res = await fetch(`/api/geo/site/${id}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.row) {
          setError(data.error || 'Lost the audit run.')
          setPhase('error')
          return
        }
        setRow(data.row as SiteAuditRow)
        if (data.row.status === 'done') {
          setPhase('done')
          return
        }
        timer = setTimeout(tick, POLL_MS)
      } catch {
        if (cancelled) return
        timer = setTimeout(tick, POLL_MS)
      }
    }
    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [phase, id])

  async function start(e: FormEvent, withEmail?: string) {
    e.preventDefault()
    if (!domain.trim()) return
    setPhase('starting')
    setError('')
    setRow(null)
    setId(null)
    try {
      const res = await fetch('/api/geo/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), email: withEmail }),
      })
      const data = await res.json()
      if (res.status === 429 || data.error === 'limit') { setPhase('limit'); return }
      if (!res.ok || !data.id) {
        setError(data.error || 'Could not start the site audit.')
        setPhase('error')
        return
      }
      setId(data.id as string)
      // POST returned only when audit completes (it runs inline), so jump straight to done.
      setPhase('polling')
    } catch {
      setError('Network error — please try again.')
      setPhase('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elev)',
    border: '1.5px solid var(--rule-strong)',
    borderRadius: 999,
    padding: '14px 22px',
    fontSize: 15,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
    flex: '1 1 280px',
    minWidth: 0,
  }

  return (
    <div>
      <form onSubmit={(e) => start(e, email || undefined)} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 560 }}>
        <input
          type="text"
          inputMode="url"
          placeholder="your-product.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={phase === 'starting' || phase === 'polling'}
          style={{
            background: (phase === 'starting' || phase === 'polling') ? 'var(--ink-faint)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '14px 28px',
            fontSize: 14,
            fontWeight: 600,
            cursor: (phase === 'starting' || phase === 'polling') ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {phase === 'starting' ? 'Starting…' : phase === 'polling' ? 'Auditing…' : 'Audit my whole site →'}
        </button>
      </form>
      <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '14px 0 0' }}>
        Reads /sitemap.xml · audits up to 30 URLs · 1–3 minutes
      </p>

      {(phase === 'starting' || phase === 'polling') && (
        <div style={{ marginTop: 32, padding: '24px 26px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Crawling sitemap & auditing</div>
          {row ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 14px', lineHeight: 1.6 }}>
                {row.audited_urls} / {row.total_urls} URLs audited
              </p>
              <div style={{ height: 6, background: 'var(--bg-card)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(row.audited_urls / Math.max(1, row.total_urls)) * 100}%`, background: 'var(--accent)', transition: 'width 0.4s ease' }} />
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.6 }}>
              Finding sitemap and queuing audits…
            </p>
          )}
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
            Daily site-audit limit reached
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 14px' }}>
            Site audits are heavy. Drop an email to unlock 3 per day.
          </p>
          <form
            onSubmit={(e) => { if (email.trim()) { localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase()); start(e, email.trim().toLowerCase()) } else e.preventDefault() }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 460 }}
          >
            <input type="email" required placeholder="you@yourproduct.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, padding: '12px 20px', fontSize: 14 }} />
            <button type="submit" style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Unlock &amp; run →
            </button>
          </form>
        </div>
      )}

      {(phase === 'done' || (phase === 'polling' && row && row.pages.length > 0)) && row && (
        <div style={{ marginTop: 44 }}>
          <SiteHeatmap row={row} />
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import type { Directory } from '@/lib/directories'
import { CATEGORIES } from '@/lib/directories'

type Goal = 'dr' | 'awareness'
type FormStatus = 'idle' | 'loading' | 'success' | 'error'

// ── Directory Browser ─────────────────────────────────────────────────────────
function DirectoryBrowser({
  directories,
  onSubmitAll,
}: {
  directories: Directory[]
  onSubmitAll: () => void
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = directories
    if (activeCategory) {
      list = list.filter(d => d.categories.includes(activeCategory))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.url.toLowerCase().includes(q) ||
        d.categories.some(c => c.toLowerCase().includes(q))
      )
    }
    return list
  }, [directories, search, activeCategory])

  return (
    <div>
      {/* Search bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#fff',
        border: '1.5px solid var(--rule-strong)',
        borderRadius: 12,
        padding: '0 20px',
        marginBottom: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--ink-faint)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search the directory database"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 15,
            color: 'var(--ink)',
            padding: '16px 0',
            fontFamily: 'inherit',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            style={{
              background: activeCategory === cat ? 'var(--ink)' : 'var(--bg-elev)',
              color: activeCategory === cat ? 'var(--bg)' : 'var(--ink-dim)',
              border: `1px solid ${activeCategory === cat ? 'var(--ink)' : 'var(--rule-strong)'}`,
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12.5,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count + place order CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
          {filtered.length} shown{activeCategory ? ` · ${activeCategory}` : ' · sample'}
        </span>
        <button
          onClick={onSubmitAll}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Place an order →
        </button>
      </div>

      {/* Directory grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 12,
      }}>
        {filtered.map(dir => (
          <div
            key={dir.id}
            style={{
              background: '#fff',
              border: dir.featured ? '1px solid var(--accent-border)' : '1px solid var(--rule)',
              borderRadius: 12,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              transition: 'border-color 0.12s, box-shadow 0.12s',
              position: 'relative',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--rule-strong)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = dir.featured ? 'var(--accent-border)' : 'var(--rule)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          >
            {/* Name + Submit */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <a
                href={dir.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', textDecoration: 'none' }}
              >
                {dir.name}
                {dir.featured && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>★</span>}
              </a>
              <button
                onClick={onSubmitAll}
                style={{
                  flexShrink: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--rule-strong)',
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--rule-strong)'
                }}
              >
                Submit
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--ink-dim)', flexWrap: 'wrap' }}>
              {dir.dr !== null && (
                <span>
                  <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 11 }}>DR: </span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{dir.dr}</span>
                </span>
              )}
              {dir.trafficText && (
                <span>
                  <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 11 }}>Traffic: </span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{dir.trafficText}</span>
                </span>
              )}
              {dir.doFollow !== null && (
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: dir.doFollow ? '#16a34a' : 'var(--ink-faint)' }}>
                  {dir.doFollow ? 'doFollow' : 'noFollow'}
                </span>
              )}
            </div>

            {/* Categories */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {dir.categories.map(cat => (
                <span
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--rule)',
                    borderRadius: 999,
                    padding: '2px 9px',
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>

            {/* Meta footer: approval ETA / price tier / needs account */}
            {(dir.approvalEta || dir.priceTier !== 'free' || dir.needsAccount) && (
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', borderTop: '1px solid var(--rule)', paddingTop: 8, marginTop: 2, flexWrap: 'wrap' }}>
                {dir.approvalEta && <span>~{dir.approvalEta}</span>}
                {dir.priceTier !== 'free' && <span style={{ color: dir.priceTier === 'paid' ? '#b07a00' : 'var(--ink-faint)' }}>{dir.priceTier}</span>}
                {dir.needsAccount && <span>account required</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 14 }}>
          No directories match your search.
        </div>
      )}
    </div>
  )
}

// ── Order form ────────────────────────────────────────────────────────────────
function OrderForm() {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [goal, setGoal] = useState<Goal>('dr')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/get-backlinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_url: url, product_name: name, description: desc, goal, contact_email: email }),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? 'Submission failed'); setStatus('error'); return }
      setStatus('success')
    } catch {
      setErrMsg('Network error, please try again')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Order received</h3>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 16px' }}>
          We&apos;ll reach out within <strong style={{ color: 'var(--ink)' }}>1–2 business days</strong> to confirm details and kick off your submissions.
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Confirmation sent to {email}</p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#fff', border: '1px solid var(--rule-strong)',
    borderRadius: 10, padding: '12px 16px', fontSize: 14,
    fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 7,
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Product URL *</label>
          <input style={inputStyle} type="url" placeholder="https://yourproduct.com" value={url} onChange={e => setUrl(e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Product name *</label>
          <input style={inputStyle} type="text" placeholder="My Product" value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Short description (optional)</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }} placeholder="1–2 sentences: what it does and who it's for" value={desc} onChange={e => setDesc(e.target.value)} maxLength={1000} />
      </div>

      <div>
        <label style={labelStyle}>Submission goal *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([['dr', 'Boost Domain Rating', 'DR 0 → 15+ within 2 months'], ['awareness', 'Brand Awareness', 'Coverage across niche directories']] as const).map(([val, title, sub]) => (
            <button key={val} type="button" onClick={() => setGoal(val)} style={{
              background: goal === val ? 'var(--accent-soft)' : '#fff',
              border: `1.5px solid ${goal === val ? 'var(--accent)' : 'var(--rule-strong)'}`,
              borderRadius: 10, padding: '13px 16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.12s',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: goal === val ? 'var(--accent)' : 'var(--ink)', marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Contact email *</label>
        <input style={inputStyle} type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>

      {status === 'error' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{errMsg}</div>
      )}

      <button type="submit" disabled={status === 'loading'} style={{
        background: status === 'loading' ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 999, padding: '14px 28px', fontSize: 14, fontWeight: 600,
        cursor: status === 'loading' ? 'not-allowed' : 'pointer', transition: 'background 0.12s',
      }}>
        {status === 'loading' ? 'Submitting…' : 'Place order →'}
      </button>

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0, lineHeight: 1.5 }}>
        We&apos;ll contact you within 1–2 business days to confirm. Credits will be deducted once the credits system launches.
      </p>
    </form>
  )
}

// ── Wrapper that wires the two together ──────────────────────────────────────
export default function InteractiveSection({ directories }: { directories: Directory[] }) {
  function scrollToForm() {
    document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <section style={{ padding: '56px 0 64px' }}>
        <div className="shell">
          <div style={{ marginBottom: 32 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}><span className="dot" />Browse the directory database</div>
            <p style={{ fontSize: 15, color: 'var(--ink-dim)', margin: 0, maxWidth: 720 }}>
              <strong style={{ color: 'var(--ink)' }}>Sample of our directory database.</strong> Search by name, filter by category. Click <strong style={{ color: 'var(--ink)' }}>Submit</strong> on any card to place your order.
            </p>
          </div>
          <DirectoryBrowser directories={directories} onSubmitAll={scrollToForm} />
        </div>
      </section>

      <section id="order-form" style={{ padding: '72px 0', borderTop: '1px solid var(--rule)', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ maxWidth: 720 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Place your order</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '0 0 8px', lineHeight: 1.05 }}>
            Ready to start? <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Let&apos;s go.</em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-dim)', margin: '0 0 40px', lineHeight: 1.6 }}>
            Fill in your product details and we&apos;ll handle the rest. We contact you within 1–2 business days to confirm before starting.
          </p>
          <div style={{ background: '#fff', border: '1px solid var(--rule)', borderRadius: 16, padding: '36px' }}>
            <OrderForm />
          </div>
        </div>
      </section>
    </>
  )
}

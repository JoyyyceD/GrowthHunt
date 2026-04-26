'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { FEATURES, MODULES, getSoonFeatures, getLiveFeatures, type Feature } from '@/lib/features'
import { MockFor } from '@/lib/mocks'

// ── Nav ──────────────────────────────────────────────────────────────────────
function TopNav({ onJoinWaitlist }: { onJoinWaitlist: () => void }) {
  return (
    <nav className="top">
      <div className="shell row">
        <div className="brand">
          <div className="mark" />
          GrowthHunt
        </div>
        <ul>
          <li><a href="#research">Research</a></li>
          <li><a href="#discovery">Discovery</a></li>
          <li><a href="#outreach">Outreach</a></li>
          <li><a href="#manage">Manage</a></li>
          <li><a href="#ecosystem">Live products</a></li>
        </ul>
        <button className="cta" onClick={onJoinWaitlist}>Join waitlist</button>
      </div>
    </nav>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState('')
  return (
    <section className="hero">
      <div className="wm serif">GTM</div>
      <div className="shell">
        <div className="grid-2">
          <div>
            <div className="eyebrow"><span className="dot" />An all-in-one go-to-market agent · in private beta</div>
            <h1>Your <em>all-in-one</em><br />go-to-market <em>agent</em>.</h1>
          </div>
          <div>
            <p className="lede">
              GrowthHunt finds the creators your buyers already trust, writes the pitch, sends it, tracks the reply, and tells you which pattern actually converts. <b>One agent. Every channel.</b>
            </p>
            <form className="hero-form" onSubmit={e => { e.preventDefault(); onSubmit(email) }}>
              <input
                type="email"
                placeholder="founder@yourstartup.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit">Get early access</button>
            </form>
            <div className="meta">
              <div className="av">
                <span /><span /><span /><span /><span />
              </div>
              <span>1,847 founders on the waitlist</span>
              <span>· No credit card · No spam</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Marquee ───────────────────────────────────────────────────────────────────
function MarqueeStrip() {
  const items = ['Reddit pain mining', 'YouTube discovery', 'AI pitch generation', 'IG creator outreach', 'Pipeline tracking', 'Pattern recognition', 'Brand knowledge base', 'Substack discovery', 'TikTok discovery']
  const tape = [...items, ...items, ...items]
  return (
    <div className="strip">
      <div className="strip-track">
        <span>
          {tape.map((t, i) => (
            <span key={i}>{t} <span className="x">×</span> </span>
          ))}
        </span>
      </div>
    </div>
  )
}

// ── Feature block ─────────────────────────────────────────────────────────────
function FeatureBlock({
  feature, flip, voted, baseVotes, onVote,
}: {
  feature: Feature
  flip: boolean
  voted: boolean
  baseVotes: number
  onVote: () => void
}) {
  const f = feature
  return (
    <div className={`feature ${flip ? 'flip' : ''}`}>
      <div className="copy">
        <div className="row-tags">
          <span className={`tag ${f.tag === 'Live' ? 'live' : 'soon'}`}>
            {f.tag === 'Live' ? '● Live' : '◌ Coming soon'}
          </span>
          <span className="tag">{f.module}</span>
        </div>
        <div className="eyebrow" style={{ marginBottom: 0 }}>{f.name}</div>
        <h3>{f.pitch}</h3>
        <p>{f.summary}</p>
        <div className="actions">
          <Link href={`/${f.id}`} className="btn-line">
            Read more <span className="arrow">→</span>
          </Link>
          <button className={`btn-vote ${voted ? 'voted' : ''}`} onClick={onVote}>
            <span className="heart">{voted ? '♥' : '♡'}</span>
            <span>Interested</span>
            <span className="count">{voted ? baseVotes + 1 : baseVotes}</span>
          </button>
        </div>
      </div>
      <div className="visual">
        <MockFor feature={f} />
      </div>
    </div>
  )
}

// ── Module section ─────────────────────────────────────────────────────────────
function ModuleSection({
  mod, features, votes, baseVotesMap, onVote,
}: {
  mod: (typeof MODULES)[number]
  features: Feature[]
  votes: Record<string, boolean>
  baseVotesMap: Record<string, number>
  onVote: (id: string) => void
}) {
  return (
    <section id={mod.id}>
      <div className="shell">
        <div className="section-head">
          <div className="num serif">{mod.num}</div>
          <h2>{mod.title} — <em>{mod.sub}</em></h2>
        </div>
        {features.map((f, i) => (
          <FeatureBlock
            key={f.id}
            feature={f}
            flip={i % 2 === 1}
            voted={!!votes[f.id]}
            baseVotes={baseVotesMap[f.id] ?? 12}
            onVote={() => onVote(f.id)}
          />
        ))}
      </div>
    </section>
  )
}

// ── Live ecosystem ─────────────────────────────────────────────────────────────
function Ecosystem({ items }: { items: Feature[] }) {
  return (
    <section id="ecosystem" className="eco">
      <div className="shell">
        <div className="section-head" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <div className="num serif">06</div>
          <h2>Already shipping — <em>traffic today</em>, not someday.</h2>
        </div>
        <div className="eco-grid">
          {items.map(p => (
            <div className="eco-card" key={p.id}>
              <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
              <div className="eco-title">{p.name}</div>
              <p>{p.summary}</p>
              <Link href={`/${p.id}`} className="visit">View product →</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Closing ────────────────────────────────────────────────────────────────────
function Closing({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState('')
  return (
    <section className="closing">
      <div className="shell">
        <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />Private beta · Q3 2026</div>
        <h2>Stop <em>guessing</em>. Start <em>shipping</em> growth.</h2>
        <p>Be among the first 200 founders to run their entire GTM through one agent. Pick the three features you most want first — we&apos;ll build those.</p>
        <form className="hero-form" onSubmit={e => { e.preventDefault(); onSubmit(email) }}>
          <input type="email" placeholder="founder@yourstartup.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <button type="submit">Claim my seat</button>
        </form>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bottom">
      <div className="shell" style={{ display: 'contents' }}>
        <div>
          <div className="big serif">GrowthHunt.</div>
          <div style={{ color: 'var(--ink-dim)', fontSize: 14, maxWidth: 280, lineHeight: 1.55 }}>
            One agent for the entire go-to-market motion. Built for indie founders, growth teams, and out-bound-going-global startups.
          </div>
        </div>
        <div>
          <h4>Modules</h4>
          <ul>
            <li><a href="#research">Research</a></li>
            <li><a href="#discovery">Discovery</a></li>
            <li><a href="#outreach">Outreach</a></li>
            <li><a href="#manage">Manage</a></li>
          </ul>
        </div>
        <div>
          <h4>Live products</h4>
          <ul>
            <li><Link href="/listingbott">ListingBott</Link></li>
            <li><Link href="/microlaunch">MicroLaunch</Link></li>
            <li><Link href="/viral-sense">Viral Sense</Link></li>
            <li><Link href="/x-templates">X Templates</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a>Manifesto</a></li>
            <li><a>Changelog</a></li>
            <li><a>Twitter / X</a></li>
            <li><a href="mailto:hi@growthhunt.ai">hi@growthhunt.ai</a></li>
          </ul>
        </div>
        <div className="copyright">
          <span>© 2026 GrowthHunt Labs</span>
          <span>Built with care · No tracking · No bullshit</span>
        </div>
      </div>
    </footer>
  )
}

// ── Waitlist modal ─────────────────────────────────────────────────────────────
function WaitlistModal({
  open, onClose, prefilledEmail,
}: {
  open: boolean
  onClose: () => void
  prefilledEmail: string
}) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(prefilledEmail)
  const [picks, setPicks] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const upcoming = getSoonFeatures()

  useEffect(() => {
    if (open) { setStep(1); setDone(false); setPicks([]); setEmail(prefilledEmail) }
  }, [open, prefilledEmail])

  if (!open) return null

  const togglePick = (id: string) => {
    setPicks(p => p.includes(id) ? p.filter(x => x !== id) : (p.length < 3 ? [...p, id] : p))
  }

  const handleFinish = async () => {
    setDone(true)
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist-modal', features: picks }),
      })
    } catch { /* silent */ }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: step === 2 ? 640 : 520 }}
      >
        <button className="close" onClick={onClose}>×</button>

        {done ? (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16, color: 'var(--accent)' }}><span className="dot" />You&apos;re in</div>
            <h3>See you in beta.</h3>
            <p>We&apos;ll prioritize <b style={{ color: 'var(--accent)' }}>{picks.length}</b> features based on what early users like you picked. Email coming when it&apos;s your turn.</p>
            <button
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '12px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : step === 1 ? (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Step 1 of 2</div>
            <h3>Get on the early-access list.</h3>
            <p>200 founders. One agent. Built around what you actually need.</p>
            <form onSubmit={e => { e.preventDefault(); setStep(2) }}>
              <input
                type="email"
                placeholder="founder@yourstartup.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--rule-strong)', borderRadius: 10, color: 'var(--ink)', fontSize: 15, fontFamily: 'inherit', marginBottom: 14, outline: 'none' }}
              />
              <button
                type="submit"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, width: '100%', cursor: 'pointer' }}
              >
                Continue →
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Step 2 of 2 · {picks.length}/3 picked</div>
            <h3>Which 3 do you want first?</h3>
            <p>Pick the three features that would change your week. We&apos;ll build those next.</p>
            <div style={{ maxHeight: 320, overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
              {upcoming.map(f => (
                <div
                  key={f.id}
                  className={`feature-pick ${picks.includes(f.id) ? 'active' : ''}`}
                  onClick={() => togglePick(f.id)}
                >
                  <div className="check">{picks.includes(f.id) ? '✓' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div className="label">{f.name}</div>
                    <div className="label-sub">{f.hook}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              disabled={picks.length === 0}
              onClick={handleFinish}
              style={{
                marginTop: 16,
                background: picks.length ? 'var(--accent)' : 'var(--bg-card)',
                color: picks.length ? 'var(--accent-ink)' : 'var(--ink-faint)',
                border: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, width: '100%',
                cursor: picks.length ? 'pointer' : 'not-allowed',
              }}
            >
              {picks.length ? `Lock in my ${picks.length} pick${picks.length > 1 ? 's' : ''}` : 'Pick at least 1 to continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Exit intent hook ──────────────────────────────────────────────────────────
function useExitIntent(callback: () => void, enabled: boolean) {
  const fired = useRef(false)
  useEffect(() => {
    if (!enabled) return
    const onLeave = (e: MouseEvent) => {
      if (e.clientY < 0 && !fired.current) {
        fired.current = true
        callback()
      }
    }
    document.addEventListener('mouseleave', onLeave)
    return () => document.removeEventListener('mouseleave', onLeave)
  }, [enabled, callback])
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return msg ? <div className="toast">{msg}</div> : null
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [votes, setVotes] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('gh-votes') || '{}') } catch { return {} }
  })
  const [toast, setToast] = useState('')

  const baseVotesMap = useMemo(() => {
    const map: Record<string, number> = {}
    FEATURES.forEach((f, i) => { map[f.id] = 12 + (i * 17) % 80 })
    return map
  }, [])

  const liveFeatures = getLiveFeatures()

  useExitIntent(() => {
    if (!waitlistOpen) setWaitlistOpen(true)
  }, true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gh-votes', JSON.stringify(votes))
    }
  }, [votes])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2400)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleVote = (id: string) => {
    setVotes(v => {
      const next = { ...v }
      if (next[id]) delete next[id]; else next[id] = true
      return next
    })
    if (!votes[id]) setToast("Thanks — we'll prioritize this one.")
  }

  const handleWaitlist = (email: string) => {
    setWaitlistEmail(email)
    setWaitlistOpen(true)
  }

  const contentModules = MODULES.filter(m => m.id !== 'distribution')

  return (
    <div>
      <TopNav onJoinWaitlist={() => setWaitlistOpen(true)} />
      <Hero onSubmit={handleWaitlist} />
      <MarqueeStrip />

      {contentModules.map(mod => (
        <ModuleSection
          key={mod.id}
          mod={mod}
          features={FEATURES.filter(f => f.module === mod.id)}
          votes={votes}
          baseVotesMap={baseVotesMap}
          onVote={handleVote}
        />
      ))}

      <Ecosystem items={liveFeatures} />
      <Closing onSubmit={handleWaitlist} />
      <Footer />

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        prefilledEmail={waitlistEmail}
      />
      <Toast msg={toast} />
    </div>
  )
}

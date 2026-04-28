'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FEATURES, MODULES } from '@/lib/features'
import { ModuleSection } from '@/lib/site/ModuleSection'
import { WaitlistModal, useExitIntent, Toast } from '@/lib/site/WaitlistModal'

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

function Hero({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState('')
  return (
    <section className="hero">
      <div className="wm serif">SOON</div>
      <div className="shell">
        <div className="grid-2">
          <div>
            <div className="eyebrow"><span className="dot" />Roadmap · Q3 2026 private beta</div>
            <h1>Where GrowthHunt is <em>heading</em>.</h1>
          </div>
          <div>
            <p className="lede">
              22 features across four modules. Research the pain, find the creators, write the pitch, manage the pipeline.
              <b> Get on the waitlist to shape what ships first.</b>
            </p>
            <form className="hero-form" onSubmit={e => { e.preventDefault(); onSubmit(email) }}>
              <input
                type="email"
                placeholder="founder@yourstartup.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit">Join waitlist</button>
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
        <div style={{ marginTop: 32 }}>
          <Link href="/" style={{ color: 'var(--ink-faint)', fontSize: 13, textDecoration: 'underline' }}>
            ← Back to live tools
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function ComingSoonClient() {
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

  const upcomingModules = MODULES.filter(m => m.id !== 'distribution')

  return (
    <>
      <Hero onSubmit={handleWaitlist} />
      <MarqueeStrip />

      {upcomingModules.map(mod => (
        <ModuleSection
          key={mod.id}
          mod={mod}
          features={FEATURES.filter(f => f.module === mod.id && f.tag === 'Soon')}
          votes={votes}
          baseVotesMap={baseVotesMap}
          onVote={handleVote}
        />
      ))}

      <Closing onSubmit={handleWaitlist} />

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        prefilledEmail={waitlistEmail}
      />
      <Toast msg={toast} />
    </>
  )
}

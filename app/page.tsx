import Link from 'next/link'
import { MODULES, FEATURES, getLiveFeatures } from '@/lib/features'
import { TopNav } from '@/lib/site/TopNav'

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a
                href="#live"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
              >
                Explore live tools →
              </a>
              <Link
                href="/coming-soon"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
              >
                See what&apos;s coming →
              </Link>
            </div>
            <div className="meta" style={{ marginTop: 24 }}>
              <span style={{ color: 'var(--ink-faint)' }}>
                5 tools shipping traffic today · more in the works
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Live cases ────────────────────────────────────────────────────────────────
function LiveCases() {
  const items = getLiveFeatures()
  return (
    <section id="live" className="eco">
      <div className="shell">
        <div className="section-head" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <div className="num serif">01</div>
          <h2>Live cases — <em>tools shipping traffic today</em>.</h2>
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

// ── Roadmap teaser ────────────────────────────────────────────────────────────
function RoadmapTeaser() {
  const upcomingModules = MODULES.filter(m => m.id !== 'distribution')
  const counts = Object.fromEntries(
    upcomingModules.map(m => [m.id, FEATURES.filter(f => f.module === m.id && f.tag === 'Soon').length])
  )

  return (
    <section style={{ padding: '96px 0', borderTop: '1px solid var(--rule)', background: 'var(--bg-card)' }}>
      <div className="shell">
        <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Roadmap</div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px', maxWidth: 720 }}>
          The full agent is <em>coming</em>.
        </h2>
        <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 540, lineHeight: 1.6, margin: '0 0 40px' }}>
          22 features across four modules — research, discovery, outreach, management. Live tools are the first chapter.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', marginBottom: 40 }}>
          {upcomingModules.map(m => (
            <Link
              key={m.id}
              href={`/coming-soon#${m.id}`}
              style={{ background: 'var(--bg)', padding: 28, display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none' }}
              className="blog-card"
            >
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {m.num} · {counts[m.id]} features
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                {m.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
                {m.sub}
              </div>
            </Link>
          ))}
        </div>
        <Link
          href="/coming-soon"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--ink)', color: 'var(--bg)', border: 'none', padding: '14px 26px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          See the full roadmap →
        </Link>
      </div>
    </section>
  )
}

// ── Closing ────────────────────────────────────────────────────────────────────
function Closing() {
  return (
    <section className="closing">
      <div className="shell">
        <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />Get started</div>
        <h2>Stop <em>guessing</em>. Start <em>shipping</em> growth.</h2>
        <p>Log in to launch the live tools, save your work, and get early access as new modules ship.</p>
        <Link
          href="/login"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 26px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginTop: 16 }}
        >
          Log in / Sign up →
        </Link>
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
          <h4>Product</h4>
          <ul>
            <li><a href="#live">Live tools</a></li>
            <li><Link href="/coming-soon">Coming soon</Link></li>
            <li><Link href="/blog">Blog</Link></li>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>
      <TopNav variant="home" />
      <Hero />
      <LiveCases />
      <RoadmapTeaser />
      <Closing />
      <Footer />
    </div>
  )
}

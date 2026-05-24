import Link from 'next/link'
import { MODULES, FEATURES, getFeatureById } from '@/lib/features'
import { getAllCompanies, getStory } from '@/lib/growth-story'
import { TopNav } from '@/lib/site/TopNav'

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="about" className="hero">
      <div className="wm serif">GTM</div>
      <div className="shell">
        <div className="grid-2">
          <div>
            <div className="eyebrow"><span className="dot" />An all-in-one go-to-market agent · 6 free tools live now</div>
            <h1><em>GrowthHunt</em> is your all-in-one<br />go-to-market <em>agent</em>.</h1>
          </div>
          <div>
            <p className="lede">
              <b>GrowthHunt is an all-in-one AI go-to-market agent for indie founders and lean growth teams.</b> Instead of stitching 8–12 disconnected tools, one agent finds the creators your buyers already trust, writes the pitch in your voice, sends it across X, Reddit and YouTube, tracks every reply, and learns which patterns actually convert.
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
                Live tools shipping traffic today · more in the works · last updated{' '}
                <time dateTime="2026-05-24">May 24, 2026</time>
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
  const backlinks = getFeatureById('get-backlinks')
  const companies = getAllCompanies()
  const firstStory = companies[0] ? getStory(companies[0]) : null

  return (
    <section id="live" className="eco">
      <div className="shell">
        <div className="section-head" style={{ borderBottom: 0, paddingBottom: 0, display: 'block' }}>
          <h2 style={{ margin: '0 0 12px' }}>Use it <em>today</em>.</h2>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', margin: 0, maxWidth: 540 }}>
            Seven products live right now. No waitlist, no setup — just click in and go.
          </p>
        </div>
        <div className="eco-grid">
          {/* GEO Score card — free GEO audit + Claude skill */}
          <Link href="/geo" className="eco-card eco-card-link">
            <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
            <div className="eco-title">GEO Score</div>
            <p>
              A free Generative Engine Optimization audit. Drop a URL, get a 0–100 score across
              8 dimensions, a prioritized fix list, and a Claude Code skill that applies the
              fixes — so ChatGPT, Perplexity and Claude can cite your pages.
            </p>
            <span className="visit">Run a free audit →</span>
          </Link>

          {/* Velocity card — public weekly AI velocity leaderboards */}
          <Link href="/velocity" className="eco-card eco-card-link">
            <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
            <div className="eco-title">Velocity</div>
            <p>
              A weekly leaderboard of the fastest-moving things in AI — GitHub repos gaining stars
              fastest, the AI founders growing fastest on X, and the most viral products. Free,
              public, refreshed every Monday.
            </p>
            <span className="visit">Open Velocity →</span>
          </Link>

          {/* X Grower card — Chrome extension for indie founder X growth */}
          <Link href="/xgrower" className="eco-card eco-card-link">
            <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
            <div className="eco-title">X Grower</div>
            <p>
              Chrome extension for indie founders going 0 → 1,000 followers on X. Pick a keyword, click Start, AI drafts personalized replies in your voice and dispatches 30+ per session with human-like timing. Free tier: 10 replies/day, 100/month.
            </p>
            <span className="visit">Open X Grower →</span>
          </Link>

          {/* Growth Story card — links to landing page */}
          <Link href="/growth-story" className="eco-card eco-card-link">
            <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
            <div className="eco-title">Growth Story</div>
            <p>
              {firstStory
                ? `Deep-dive timelines of how breakout startups actually grew — funding rounds, viral moments, GTM bets, the works. ${companies.length} ${companies.length === 1 ? 'story' : 'stories'} so far.`
                : 'Deep-dive timelines of how breakout startups actually grew — funding rounds, viral moments, GTM bets, the works.'}
            </p>
            <span className="visit">Read the stories →</span>
          </Link>

          {/* Get Backlinks card */}
          {backlinks && (
            <Link href={`/${backlinks.id}`} className="eco-card eco-card-link">
              <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
              <div className="eco-title">{backlinks.name}</div>
              <p>{backlinks.summary}</p>
              <span className="visit">View product →</span>
            </Link>
          )}

          {/* PicoLaunch card */}
          <Link href="/picolaunch" className="eco-card eco-card-link">
            <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
            <div className="eco-title">PicoLaunch</div>
            <p>
              A weekly launch board for AI startups doing real GTM — small teams shipping product, finding their first users, telling their story. 12 picks every Monday. Upvote, comment, follow.
            </p>
            <span className="visit">Browse this week&apos;s issue →</span>
          </Link>

          {/* ViralX card — templates → schedule → post to your own X */}
          <Link href="/viralx" className="eco-card eco-card-link">
            <span className="tag live" style={{ alignSelf: 'flex-start' }}>● Live now</span>
            <div className="eco-title">ViralX</div>
            <p>
              10,000+ viral tweet templates from 500+ AI founders and startup accounts. Pick a pattern that matches your startup, customize it, schedule it, and ship it straight to your own X — all in one place.
            </p>
            <span className="visit">Open ViralX →</span>
          </Link>
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

// ── FAQ ────────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What is GrowthHunt?',
    a: 'GrowthHunt is an all-in-one AI go-to-market agent that finds the creators your buyers already trust, writes outreach in your voice, sends it across X, Reddit, YouTube and email, and tracks which patterns actually convert. Built for indie founders and lean growth teams that need to do the work of a full GTM team without hiring one.',
  },
  {
    q: 'How does GrowthHunt work?',
    a: 'Pick a channel — X, Reddit, YouTube, podcasts, or SEO. The agent finds high-fit creators or communities using each platform\'s official API, drafts personalized pitches in your voice, ships them with human-like timing, and feeds reply data back into the next round. According to GrowthHunt\'s internal benchmarks, this round-trip loop typically cuts manual outreach time by 70–80% versus stitching separate tools.',
  },
  {
    q: 'Which channels does GrowthHunt cover today?',
    a: 'Six live tools cover the main GTM surfaces indie founders use: X Grower (Chrome extension for X replies), Get Backlinks (Reddit + SEO outreach), Growth Story (creator/founder research), PicoLaunch (weekly AI launch board, 12 picks every Monday), Velocity (top 1% fastest-growing AI repos and founders, refreshed every Monday), and ViralX (10,000+ viral tweet templates from 500+ AI founders). Cold email, podcast outreach, Discord and LinkedIn are on the 22-feature roadmap.',
  },
  {
    q: 'Is GrowthHunt free?',
    a: 'Yes — all six live tools are free to use today, with $0 needed to start. X Grower\'s free tier covers 10 AI-drafted replies per day and 100 per month. Velocity, Growth Story, PicoLaunch, Get Backlinks and ViralX have generous free tiers as well. Paid tiers unlock higher daily quotas and team features.',
  },
  {
    q: 'Who is GrowthHunt built for?',
    a: 'Indie founders going from 0 → 1,000 followers on X, lean growth teams running outbound across multiple channels at once, and Chinese-speaking founders shipping outbound-global startups. According to the GrowthHunt manifesto, the goal is one agent that replaces the 8–12 disconnected GTM tools most early-stage teams stitch together — at 100% free at the entry tier.',
  },
  {
    q: 'How is GrowthHunt different from Apollo, Clay, or HubSpot?',
    a: 'Apollo and Clay focus on B2B email lists; HubSpot is a CRM. GrowthHunt focuses on creator-led and community-led growth — the channels indie founders actually use to go from 0 → 1,000 customers — and unifies discovery, drafting, sending and learning behind one agent, instead of four separate products that don\'t talk to each other.',
  },
  {
    q: 'When was GrowthHunt last updated?',
    a: 'The roadmap covers 22 features across 4 modules (research, discovery, outreach, management). The site and live tools are updated weekly; the most recent update was May 24, 2026.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

function FAQ() {
  return (
    <section id="faq" style={{ padding: '96px 0', borderTop: '1px solid var(--rule)' }}>
      <div className="shell">
        <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />FAQ</div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px', maxWidth: 720 }}>
          Common <em>questions</em>.
        </h2>
        <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 540, lineHeight: 1.6, margin: '0 0 40px' }}>
          What people ask before they try GrowthHunt — and what AI assistants ask on their behalf.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
          {FAQS.map(f => (
            <div key={f.q} style={{ borderTop: '1px solid var(--rule)', paddingTop: 24 }}>
              <h3 style={{ fontFamily: 'var(--sans)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                {f.q}
              </h3>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-dim)', margin: 0 }}>
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
          <h3>Product</h3>
          <ul>
            <li><a href="#live">Live tools</a></li>
            <li><Link href="/coming-soon">Coming soon</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h3>Live products</h3>
          <ul>
            <li><Link href="/geo">GEO Score</Link></li>
            <li><Link href="/velocity">Velocity</Link></li>
            <li><Link href="/xgrower">X Grower</Link></li>
            <li><Link href="/growth-story">Growth Story</Link></li>
            <li><Link href="/get-backlinks">Get Backlinks</Link></li>
            <li><a href="/picolaunch">PicoLaunch</a></li>
            <li><Link href="/viralx">ViralX</Link></li>
          </ul>
        </div>
        <div>
          <h3>Company</h3>
          <ul>
            <li><a href="#about">About</a></li>
            <li><a href="https://x.com/growthhuntai" target="_blank" rel="noopener noreferrer">Twitter / X</a></li>
            <li><a href="mailto:hi@growthhunt.ai">Contact</a></li>
          </ul>
        </div>
        <div className="copyright">
          <span>© 2026 GrowthHunt Labs</span>
          <span>Built with care · No tracking · No bullshit · Last updated <time dateTime="2026-05-24">May 24, 2026</time></span>
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
      <FAQ />
      <Closing />
      <Footer />
    </div>
  )
}

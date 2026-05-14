import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { getAllLaunches, getLaunchCompanies, sortLaunchesByDate } from '@/lib/growth-launches'
import LaunchesGrid from './LaunchesGrid'

export const metadata: Metadata = {
  title: 'Launch Playbooks: Every Major AI Startup Launch, Move by Move',
  description: '150+ single-launch breakdowns — what got published where, in what order, with what role. Cursor 2.0, Lovable v1, Gamma AI relaunch, Plaud Kickstarter, and more.',
  alternates: {
    canonical: 'https://growthhunt.ai/growth-launches',
    languages: {
      'en-US': 'https://growthhunt.ai/growth-launches',
      'zh-CN': 'https://growthhunt.ai/growth-launches/zh',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/growth-launches',
    title: 'Launch Playbooks: Every Major AI Startup Launch, Move by Move',
    description: '150+ single-launch breakdowns — channels, order, founder script, and what to copy.',
  },
}

export default function GrowthLaunchesIndex() {
  const launches = sortLaunchesByDate(getAllLaunches('en'))
  const companies = getLaunchCompanies(launches)

  return (
    <div>
      <TopNav variant="page" />

      <section className="hero" style={{ paddingBottom: 56 }}>
        <div className="wm serif">LAUNCH</div>
        <div className="shell">
          <div className="grid-2">
            <div>
              <div className="eyebrow"><span className="dot" />Launch Playbooks</div>
              <h1>
                One launch, <em>move by move</em>.
              </h1>
            </div>
            <div>
              <p className="lede">
                {launches.length} single-launch breakdowns: which channel went first, what the founder posted in week one, which milestone got bundled, why this order worked. <b>For each launch — the script you can copy, not the recap.</b>
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                <a
                  href="#all-launches"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Browse all launches →
                </a>
                <Link
                  href="/growth-campaigns"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  See channel playbooks
                </Link>
              </div>
              <div className="meta" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  {launches.length} launches · {companies.length} companies · newest first
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="rule" />

      <section id="all-launches" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />The library</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 24px' }}>
            All launches.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', maxWidth: 720, lineHeight: 1.55, marginBottom: 40 }}>
            Click any launch to see its full breakdown — channels, order, founder script, what worked, what didn&apos;t.
          </p>
          <LaunchesGrid launches={launches} companies={companies} locale="en" />
        </div>
      </section>

      <hr className="rule" />

      <section style={{ padding: '80px 0 120px' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />Inside each breakdown</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 48px', maxWidth: 780 }}>
            The <em>script</em>, not the recap.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
            {[
              { num: '01', title: 'Channel order', body: 'Which channel fired first, which followed, which never participated — and why that sequence mattered.' },
              { num: '02', title: 'Founder script', body: 'Day-1 announcement, daily updates, week-4 long-form. Tone, cadence, the exact format that compounded.' },
              { num: '03', title: 'Bundled milestones', body: 'Funding + ARR fired together. Product launch + acquisition. Which moments got combined for compound coverage.' },
              { num: '04', title: 'Why it worked here', body: 'Preconditions — audience built up, brand fit, product readiness. Not all moves transplant. We show what made each one land.' },
            ].map(item => (
              <div key={item.num} style={{ background: 'var(--bg)', padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.num}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.2 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.55 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="closing" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />More coming</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
            Want a specific launch broken down?
          </h2>
          <p>Tell us which one you want pulled apart next.</p>
          <a
            href="mailto:hi@growthhunt.ai?subject=Launch breakdown request"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginTop: 16 }}
          >
            Email us a request →
          </a>
        </div>
      </section>
    </div>
  )
}

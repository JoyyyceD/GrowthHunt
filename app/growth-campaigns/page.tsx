import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { getAllPlaybooks, getChannelFilters } from '@/lib/growth-campaigns'
import CampaignsGrid from './CampaignsGrid'

export const metadata: Metadata = {
  title: 'Marketing Channel Playbooks: How 23 Breakout AI Startups Actually Launched',
  description: 'The exact X / YouTube / Hacker News / Reddit / Instagram / TikTok stack each breakout AI startup used to launch and grow — with the catalyst event that lit each channel.',
  alternates: {
    canonical: 'https://growthhunt.ai/growth-campaigns',
    languages: {
      'en-US': 'https://growthhunt.ai/growth-campaigns',
      'zh-CN': 'https://growthhunt.ai/growth-campaigns/zh',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/growth-campaigns',
    title: 'Marketing Channel Playbooks: How 23 Breakout AI Startups Launched',
    description: 'The exact channel stack each breakout startup used — X, YouTube, HN, Reddit, IG, TikTok — with the catalyst event for each.',
  },
}

export default function GrowthCampaignsIndex() {
  const playbooks = getAllPlaybooks('en')
  const channelFilters = getChannelFilters('en')
  const totalChannels = playbooks.reduce((s, p) => s + p.channels.length, 0)

  return (
    <div>
      <TopNav variant="page" />

      <section className="hero" style={{ paddingBottom: 56 }}>
        <div className="wm serif">PLAYBOOK</div>
        <div className="shell">
          <div className="grid-2">
            <div>
              <div className="eyebrow"><span className="dot" />Channel Playbooks</div>
              <h1>
                The exact channel stack each startup <em>actually used</em>.
              </h1>
            </div>
            <div>
              <p className="lede">
                For {playbooks.length} breakout startups: which channels (X, YouTube, HN, Reddit, IG, TikTok…) they leaned on, what role each one played, and the single catalyst event that lit it up. <b>One playbook per company. {totalChannels} channels total.</b>
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                <a
                  href="#all-playbooks"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Browse all playbooks →
                </a>
                <Link
                  href="/growth-story"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Read full growth stories
                </Link>
              </div>
              <div className="meta" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  {playbooks.length} companies · {totalChannels} channel plays · filter by channel to compare
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="rule" />

      <section id="all-playbooks" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />The library</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 24px' }}>
            Every channel stack.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', maxWidth: 720, lineHeight: 1.55, marginBottom: 40 }}>
            Filter by channel to see which companies leaned on it and how. Or scroll a single company end-to-end to see the full stack.
          </p>
          <CampaignsGrid playbooks={playbooks} channelFilters={channelFilters} locale="en" />
        </div>
      </section>

      <hr className="rule" />

      <section style={{ padding: '80px 0 120px' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />How to read</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 48px', maxWidth: 780 }}>
            Read the <em>stack</em>, not the channels.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
            {[
              { num: '01', title: 'Score = load-bearing', body: 'Five dots means this channel drove the company. One dot means they tried and it did nothing — equally useful intel.' },
              { num: '02', title: 'Catalyst = the spark', body: 'Every channel has a single event that lit it up — a viral tweet, a podcast, an HN front page, a Reels format. That\'s the move you study.' },
              { num: '03', title: 'When works / doesn\'t', body: 'The preconditions for the channel to pay off, and the failure mode. Use this to pattern-match against your own product.' },
              { num: '04', title: 'Built for going global', body: 'These are the moves Western AI startups ran. Cross-reference with your own product / audience / stage before copying.' },
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
            Want a specific stack?
          </h2>
          <p>Tell us which company&apos;s channel mix you want pulled apart next.</p>
          <a
            href="mailto:hi@growthhunt.ai?subject=Channel Playbook request"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginTop: 16 }}
          >
            Email us a request →
          </a>
        </div>
      </section>
    </div>
  )
}

import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { getAllCompanies, getStory, type GrowthStoryMain } from '@/lib/growth-story'

export const metadata: Metadata = {
  title: 'Growth Story — how breakout startups actually grew',
  description: 'Deep-dive timelines reconstructing how startups like Cursor, Lovable, and Genspark actually grew — funding rounds, viral moments, GTM bets, the works.',
  alternates: { canonical: 'https://growthhunt.ai/growth-story' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/growth-story',
    title: 'Growth Story — how breakout startups actually grew',
    description: 'Deep-dive timelines of breakout startups, reconstructed from public sources.',
  },
}

export default function GrowthStoryIndex() {
  const stories = getAllCompanies()
    .map(slug => ({ slug, story: getStory(slug) }))
    .filter((x): x is { slug: string; story: GrowthStoryMain } => x.story !== null)

  const featured = stories[0]
  const rest = stories.slice(1)

  return (
    <div>
      <TopNav variant="page" />

      {/* Hero */}
      <section className="hero" style={{ paddingBottom: 56 }}>
        <div className="wm serif">STORY</div>
        <div className="shell">
          <div className="grid-2">
            <div>
              <div className="eyebrow"><span className="dot" />Growth Story</div>
              <h1>
                How breakout startups <em>actually</em> grew.
              </h1>
            </div>
            <div>
              <p className="lede">
                Deep-dive timelines of every viral moment, funding round, product launch, and GTM bet — reconstructed from public sources, mapped to ARR and valuation curves you can scrub through. <b>Read the case, not the takeaways.</b>
              </p>
              {featured && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                  <Link
                    href={`/growth-story/${featured.slug}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                  >
                    Start with {featured.story.timeline.company.name} →
                  </Link>
                  <a
                    href="#all-stories"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                  >
                    Browse all stories
                  </a>
                </div>
              )}
              <div className="meta" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--ink-faint)' }}>
                  {stories.length} {stories.length === 1 ? 'story' : 'stories'} · interactive timelines · cited sources
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="rule" />

      {/* All stories */}
      <section id="all-stories" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />The library</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 48px' }}>
            All stories.
          </h2>

          {stories.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)' }}>No stories yet — check back soon.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
              {stories.map(({ slug, story }) => (
                <Link
                  key={slug}
                  href={`/growth-story/${slug}`}
                  className="blog-card"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <article style={{ padding: '36px', minHeight: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="tag live">{story.timeline.company.name}</span>
                      <span className="tag">{story.readTime} read</span>
                      <span className="tag">{story.timeline.events.length} events</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 400, margin: 0, flex: 1 }}>
                      {story.title}
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.55 }}>
                      {story.description}
                    </p>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Founded {story.timeline.company.founded}</span>
                      <span style={{ color: 'var(--accent)' }}>Read story →</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <hr className="rule" />

      {/* What's inside each story */}
      <section style={{ padding: '80px 0 120px' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />Inside every story</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 48px', maxWidth: 780 }}>
            More than a recap. A <em>working model</em> of how growth happened.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
            {[
              {
                num: '01',
                title: 'Interactive timeline',
                body: 'Funding, product, media, and pivot events plotted on the same axis as the ARR and valuation curves they actually moved.',
              },
              {
                num: '02',
                title: 'Inline deep dives',
                body: 'Click any event for a full article — sourced, dated, quoted. Hacker News thread analysis. Tweet receipts. Founder interviews.',
              },
              {
                num: '03',
                title: 'Platform Mix',
                body: 'Which channels actually moved the needle for this company — Reddit, Twitter, podcast tour, paid, OSS — scored by stage and effort.',
              },
              {
                num: '04',
                title: 'Cited sources',
                body: 'Every number, quote, and date links back to a primary source. No AI hallucinations. No vibes-based history.',
              },
            ].map(item => (
              <div key={item.num} style={{ background: 'var(--bg)', padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {item.num}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.55 }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="closing" style={{ padding: '80px 0' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />More coming</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.0, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
            Want a specific story?
          </h2>
          <p>Tell us which startup you want reverse-engineered next.</p>
          <a
            href="mailto:hi@growthhunt.ai?subject=Growth Story request"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginTop: 16 }}
          >
            Email us a request →
          </a>
        </div>
      </section>
    </div>
  )
}

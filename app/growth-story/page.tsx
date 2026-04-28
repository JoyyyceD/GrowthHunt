import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { getAllCompanies, getStory } from '@/lib/growth-story'

export const metadata: Metadata = {
  title: 'Growth Story — how breakout startups actually grew',
  description: 'Deep-dive timelines of how breakout startups grew — funding rounds, viral moments, GTM bets, the works.',
  alternates: { canonical: 'https://growthhunt.ai/growth-story' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/growth-story',
    title: 'Growth Story — how breakout startups actually grew',
    description: 'Deep-dive timelines of how breakout startups grew.',
  },
}

export default function GrowthStoryIndex() {
  const companies = getAllCompanies()
    .map(slug => ({ slug, story: getStory(slug) }))
    .filter((x): x is { slug: string; story: NonNullable<ReturnType<typeof getStory>> } => x.story !== null)

  return (
    <div>
      <TopNav variant="page" />

      <section style={{ padding: '80px 0 48px' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 16 }}><span className="dot" />Growth Story</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(48px, 6vw, 80px)', lineHeight: 0.96, letterSpacing: '-0.03em', fontWeight: 400, margin: '0 0 16px' }}>
            How breakout startups <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>actually</em> grew.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-dim)', maxWidth: 600, lineHeight: 1.55, margin: 0 }}>
            Deep-dive timelines — funding rounds, product launches, viral moments, GTM bets — reconstructed from public sources for every breakout you wish you understood.
          </p>
        </div>
      </section>

      <hr className="rule" />

      <section style={{ padding: '64px 0 120px' }}>
        <div className="shell">
          {companies.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)' }}>No stories yet — check back soon.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
              {companies.map(({ slug, story }) => (
                <Link
                  key={slug}
                  href={`/growth-story/${slug}`}
                  className="blog-card"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <article style={{ padding: '36px', minHeight: 240, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="tag">{story.timeline.company.legalName ?? story.timeline.company.name}</span>
                      <span className="tag">{story.readTime} read</span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 400, margin: 0, flex: 1 }}>
                      {story.title}
                    </h2>
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
    </div>
  )
}

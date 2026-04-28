import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getStory, getAllCompanies } from '@/lib/growth-story'
import { mdxComponents } from '@/lib/growth-story-mdx'
import CaseStudyTimeline from '@/components/CaseStudyTimeline'
import PlatformMix from '@/components/PlatformMix'

interface Props {
  params: Promise<{ company: string }>
}

export async function generateStaticParams() {
  return getAllCompanies().map(company => ({ company }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company } = await params
  const story = getStory(company)
  if (!story) return {}
  const url = `https://growthhunt.ai/growth-story/${company}`
  return {
    title: story.title,
    description: story.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: story.title,
      description: story.description,
      publishedTime: story.date,
    },
    twitter: { card: 'summary_large_image', title: story.title, description: story.description },
  }
}

export default async function GrowthStoryPage({ params }: Props) {
  const { company } = await params
  const story = getStory(company)
  if (!story) notFound()

  const { timeline } = story
  const TYPE_COLOR: Record<string, string> = {
    product: '#2563eb',
    funding: '#16a34a',
    media: '#dc2626',
    acquisition: '#9333ea',
  }
  const TYPE_LABEL: Record<string, string> = {
    product: 'Product',
    funding: 'Funding',
    media: 'Media',
    acquisition: 'M&A',
  }

  const deepDives = timeline.events.filter(e => e.articleSlug)

  // Section heading helper component (number + serif title + lede)
  const SectionHead = ({
    num,
    eyebrow,
    title,
    titleAccent,
    lede,
  }: {
    num: string
    eyebrow: string
    title: React.ReactNode
    titleAccent?: string
    lede?: React.ReactNode
  }) => (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 24,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 56,
            lineHeight: 1,
            color: 'var(--ink-faint)',
            letterSpacing: '-0.02em',
          }}
        >
          {num}
        </span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--ink-faint)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
          {eyebrow}
        </span>
      </div>
      <h2
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(36px, 4.6vw, 56px)',
          fontWeight: 400,
          letterSpacing: '-0.028em',
          lineHeight: 1.02,
          margin: '0 0 18px',
          maxWidth: 920,
        }}
      >
        {title}
        {titleAccent && (
          <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{titleAccent}</em>
        )}
      </h2>
      {lede && (
        <p
          style={{
            fontSize: 17,
            color: 'var(--ink-dim)',
            maxWidth: 680,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {lede}
        </p>
      )}
    </div>
  )

  return (
    <div>
      <nav className="top">
        <div className="shell row">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
            <div className="mark" />
            GrowthHunt
          </Link>
          <ul>
            <li>
              <Link href="/blog">Blog</Link>
            </li>
            <li>
              <Link href={`/growth-story/${company}`} style={{ color: 'var(--ink)' }}>
                Growth Story
              </Link>
            </li>
          </ul>
          <Link
            href="/"
            className="cta"
            style={{
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              padding: '9px 18px',
              background: 'var(--ink)',
              color: 'var(--bg)',
              textDecoration: 'none',
            }}
          >
            ← Back to product
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '96px 0 72px', borderBottom: '1px solid var(--rule)', position: 'relative', overflow: 'hidden' }}>
        <div className="shell" style={{ position: 'relative', zIndex: 2 }}>
          <div
            className="eyebrow"
            style={{
              marginBottom: 28,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span className="dot" />
            Growth Story · No. 01
          </div>
          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(60px, 9vw, 132px)',
              lineHeight: 0.92,
              letterSpacing: '-0.038em',
              fontWeight: 400,
              margin: '0 0 28px',
              maxWidth: 1100,
            }}
          >
            {timeline.company.name}{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--ink-faint)', fontSize: '0.55em' }}>
              / {timeline.company.legalName}
            </em>
          </h1>
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(24px, 2.6vw, 32px)',
              fontStyle: 'italic',
              maxWidth: 880,
              color: 'var(--ink)',
              lineHeight: 1.32,
              margin: '0 0 36px',
              letterSpacing: '-0.015em',
            }}
          >
            {timeline.company.tagline}
          </p>
          <p style={{ fontSize: 17.5, color: 'var(--ink-dim)', maxWidth: 720, lineHeight: 1.65, margin: '0 0 34px' }}>
            {timeline.company.summary}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="tag">{story.readTime} read</span>
            <span className="tag">Founded {timeline.company.founded}</span>
            <span className="tag">{timeline.events.length} events tracked</span>
            <span className="tag">{deepDives.length} deep dives</span>
          </div>
        </div>
      </section>

      {/* Timeline chart */}
      <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <SectionHead
            num="01"
            eyebrow="Timeline"
            title="ARR, valuation, and every GTM move, "
            titleAccent="on one timeline."
            lede="Events split into four horizontal bands by type. Markers with a halo open a deep dive. Hover anything for a summary; click external markers to jump to the original source."
          />
          <CaseStudyTimeline timeline={timeline} company={company} />
        </div>
      </section>

      {/* Platform Mix */}
      {timeline.platforms && timeline.platforms.length > 0 && (
        <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <SectionHead
              num="02"
              eyebrow="Platform Mix"
              title="Which channels mattered "
              titleAccent="when."
              lede="Cursor used six platforms differently. Some carried the entire arc; some were episodic catalysts; one was the discipline of staying off."
            />
            <PlatformMix platforms={timeline.platforms} />
          </div>
        </section>
      )}

      {/* Deep dives index */}
      {deepDives.length > 0 && (
        <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <SectionHead
              num="03"
              eyebrow="Deep Dives"
              title={`${deepDives.length} key moments, `}
              titleAccent="fully unpacked."
              lede="For each: what happened, what the catalyst was, why it landed, and the reusable GTM pattern underneath."
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: 1,
                background: 'var(--rule)',
                border: '1px solid var(--rule)',
              }}
            >
              {deepDives.map(e => (
                <Link
                  key={e.articleSlug}
                  href={`/growth-story/${company}/${e.articleSlug}`}
                  className="blog-card"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <article
                    style={{
                      padding: '36px 32px 28px',
                      minHeight: 240,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        className="tag"
                        style={{
                          color: TYPE_COLOR[e.type],
                          borderColor: 'transparent',
                          background: 'var(--bg-card)',
                        }}
                      >
                        {TYPE_LABEL[e.type]}
                      </span>
                      {e.gtmTag && <span className="tag">{e.gtmTag}</span>}
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 26,
                        lineHeight: 1.18,
                        letterSpacing: '-0.022em',
                        fontWeight: 400,
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {e.title}
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.55 }}>
                      {e.description}
                    </p>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: 'var(--ink-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 'auto',
                      }}
                    >
                      <span>{e.date}</span>
                      <span style={{ color: 'var(--accent)' }}>Read →</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Body — synthesis essay */}
      <section style={{ padding: '96px 0 96px' }}>
        <div className="shell" style={{ maxWidth: 760 }}>
          <SectionHead
            num="04"
            eyebrow="Synthesis"
            title="The full thesis"
            lede="Stitching the data and the deep dives into one read on what actually drove the curve."
          />
          <div style={{ marginTop: 8 }}>
            <MDXRemote source={story.content} components={mdxComponents} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '32px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="detail-back" style={{ marginBottom: 0 }}>
            ← GrowthHunt
          </Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}

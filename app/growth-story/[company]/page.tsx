import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getStory, getAllCompanies } from '@/lib/growth-story'
import CaseStudyTimeline from '@/components/CaseStudyTimeline'

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

const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 36,
        fontWeight: 400,
        letterSpacing: '-0.02em',
        lineHeight: 1.12,
        margin: '64px 0 20px',
      }}
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 24,
        fontWeight: 400,
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
        margin: '40px 0 14px',
      }}
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      style={{
        fontSize: 17,
        lineHeight: 1.75,
        color: 'var(--ink-dim)',
        margin: '0 0 22px',
      }}
      {...props}
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul style={{ margin: '0 0 24px', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }} {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol style={{ margin: '0 0 24px', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }} {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-dim)' }} {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong style={{ color: 'var(--ink)', fontWeight: 600 }} {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      style={{
        borderLeft: '3px solid var(--accent)',
        paddingLeft: 24,
        margin: '36px 0',
        fontFamily: 'var(--serif)',
        fontSize: 22,
        fontStyle: 'italic',
        color: 'var(--ink-dim)',
        lineHeight: 1.5,
      }}
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: 'auto', margin: '0 0 24px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
          fontFamily: 'var(--mono)',
        }}
        {...props}
      />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      style={{
        textAlign: 'left',
        padding: '10px 14px',
        borderBottom: '1px solid var(--rule-strong)',
        fontWeight: 600,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--ink)',
        background: 'var(--bg-card)',
      }}
      {...props}
    />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--rule)',
        color: 'var(--ink-dim)',
      }}
      {...props}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 13,
        background: 'var(--bg-card)',
        border: '1px solid var(--rule)',
        borderRadius: 4,
        padding: '2px 6px',
        color: 'var(--ink)',
      }}
      {...props}
    />
  ),
  hr: () => <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '56px 0' }} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }} {...props} />
  ),
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

  // Articles list — events that have full deep-dive articles
  const deepDives = timeline.events.filter(e => e.articleSlug)

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
      <section className="detail-hero">
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            <span className="dot" />
            Growth Story · #01
          </div>
          <h1 style={{ margin: '12px 0 18px' }}>
            {timeline.company.name} <em>/ {timeline.company.legalName}</em>
          </h1>
          <p
            className="summary"
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              fontStyle: 'italic',
              maxWidth: 740,
              color: 'var(--ink-dim)',
              lineHeight: 1.45,
              margin: '0 0 32px',
            }}
          >
            {timeline.company.tagline}
          </p>
          <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 720, lineHeight: 1.65, margin: 0 }}>
            {timeline.company.summary}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
            <span className="tag">{story.readTime} read</span>
            <span className="tag">
              Founded {timeline.company.founded}
            </span>
            <span className="tag">{timeline.events.length} events tracked</span>
            <span className="tag">{deepDives.length} deep dives</span>
          </div>
        </div>
      </section>

      {/* Timeline chart */}
      <section style={{ padding: '64px 0 32px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            <span className="dot" />
            Timeline
          </div>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              margin: '0 0 12px',
              maxWidth: 820,
            }}
          >
            ARR, valuation, and every <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>GTM move</em>, on one timeline.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-dim)', maxWidth: 640, lineHeight: 1.55, margin: '0 0 36px' }}>
            Events split into four lanes by type. Markers with a halo open a deep dive. Others hover for summary or jump to the source.
          </p>
          <CaseStudyTimeline timeline={timeline} company={company} />
        </div>
      </section>

      {/* Deep dives index */}
      {deepDives.length > 0 && (
        <section style={{ padding: '80px 0 40px', borderBottom: '1px solid var(--rule)' }}>
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              <span className="dot" />
              Deep Dives
            </div>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(32px, 4vw, 48px)',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                margin: '0 0 12px',
                maxWidth: 820,
              }}
            >
              {deepDives.length} key moments, <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>fully unpacked</em>.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-dim)', maxWidth: 640, lineHeight: 1.55, margin: '0 0 36px' }}>
              For each: what happened, why it landed, and the reusable GTM pattern underneath.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
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
                  <article style={{ padding: '32px', minHeight: 220, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                        fontSize: 24,
                        lineHeight: 1.18,
                        letterSpacing: '-0.018em',
                        fontWeight: 400,
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {e.title}
                    </h3>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.55 }}>
                      {e.description}
                    </p>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: 'var(--ink-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        display: 'flex',
                        justifyContent: 'space-between',
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
      <section style={{ padding: '80px 0 80px' }}>
        <div className="shell" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            <span className="dot" />
            Synthesis
          </div>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              margin: '0 0 40px',
            }}
          >
            {story.title}
          </h2>
          <MDXRemote source={story.content} components={mdxComponents} />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
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

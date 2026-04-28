import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import {
  getStory,
  getAllCompanies,
  getEventArticle,
  type EventArticle,
} from '@/lib/growth-story'
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

export default async function GrowthStoryPage({ params }: Props) {
  const { company } = await params
  const story = getStory(company)
  if (!story) notFound()

  const { timeline } = story

  // Load all event articles in chronological order
  const deepDives: EventArticle[] = timeline.events
    .filter(e => e.articleSlug)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => getEventArticle(company, e.articleSlug!))
    .filter((a): a is EventArticle => a !== null)

  // Section heading helper
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
      <section
        style={{
          padding: '96px 0 72px',
          borderBottom: '1px solid var(--rule)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
          <p
            style={{
              fontSize: 17.5,
              color: 'var(--ink-dim)',
              maxWidth: 720,
              lineHeight: 1.65,
              margin: '0 0 34px',
            }}
          >
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

      {/* 01 — Timeline chart */}
      <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <SectionHead
            num="01"
            eyebrow="Timeline"
            title="ARR, valuation, and every GTM move, "
            titleAccent="on one timeline."
            lede="Events split into four horizontal bands by type. Markers with a halo jump to a deep-dive section below. Hover anything for a summary; click external markers to jump to the original source."
          />
          <CaseStudyTimeline timeline={timeline} company={company} />
        </div>
      </section>

      {/* 02 — Platform Mix */}
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

      {/* 03 — Synthesis */}
      <section style={{ padding: '88px 0 64px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell">
          <SectionHead
            num="03"
            eyebrow="Synthesis"
            title="The full "
            titleAccent="thesis."
            lede="The big-picture read on what actually drove the curve — before zooming in on each key moment."
          />
          <div style={{ marginTop: 8 }} className="growth-prose">
            <MDXRemote
              source={story.content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>
        </div>
      </section>

      {/* 04 — Deep Dives (inline, all 7 articles in one flow) */}
      {deepDives.length > 0 && (
        <section style={{ padding: '88px 0 0' }}>
          <div className="shell">
            <SectionHead
              num="04"
              eyebrow="Deep Dives"
              title={`${deepDives.length} key moments, `}
              titleAccent="fully unpacked."
              lede="For each: the catalyst, the concrete numbers, why it landed, and the reusable pattern underneath. Read straight through, or jump to any one."
            />

            {/* Jump-to navigation strip */}
            <nav
              aria-label="Deep dive navigation"
              style={{
                margin: '8px 0 0',
                paddingTop: 24,
                paddingBottom: 24,
                borderTop: '1px solid var(--rule)',
                borderBottom: '1px solid var(--rule)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 4,
              }}
            >
              {deepDives.map((a, idx) => (
                <a
                  key={a.slug}
                  href={`#deep-dive-${a.slug}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    padding: '12px 14px',
                    textDecoration: 'none',
                    borderRadius: 6,
                    transition: 'background 0.15s',
                    color: 'var(--ink)',
                  }}
                  className="blog-card"
                >
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: TYPE_COLOR[a.type],
                      fontWeight: 600,
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')} · {a.date}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 15,
                      lineHeight: 1.25,
                      fontWeight: 400,
                      letterSpacing: '-0.012em',
                      color: 'var(--ink)',
                    }}
                  >
                    {a.eventTitle}
                  </span>
                </a>
              ))}
            </nav>
          </div>

          {/* Inline deep-dive articles */}
          {deepDives.map((a, idx) => (
            <article
              key={a.slug}
              id={`deep-dive-${a.slug}`}
              style={{
                padding: '88px 0 88px',
                borderBottom:
                  idx === deepDives.length - 1 ? '1px solid var(--rule)' : 'none',
                scrollMarginTop: 88,
              }}
            >
              <div className="shell">
                {/* Per-event header */}
                <div style={{ marginBottom: 36 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 20,
                      marginBottom: 18,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--serif)',
                        fontStyle: 'italic',
                        fontSize: 44,
                        lineHeight: 1,
                        color: 'var(--ink-faint)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      04 / {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: 'var(--ink-faint)',
                      }}
                    >
                      {a.date}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                    <span
                      className="tag"
                      style={{
                        color: TYPE_COLOR[a.type],
                        borderColor: 'transparent',
                        background: 'var(--bg-card)',
                      }}
                    >
                      {TYPE_LABEL[a.type]}
                    </span>
                    {a.gtmTag && <span className="tag">{a.gtmTag}</span>}
                  </div>
                  <h2
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 'clamp(34px, 4.4vw, 52px)',
                      lineHeight: 1.02,
                      letterSpacing: '-0.028em',
                      fontWeight: 400,
                      margin: '0 0 22px',
                    }}
                  >
                    {a.title}
                  </h2>
                  <p
                    style={{
                      fontSize: 19,
                      color: 'var(--ink-dim)',
                      lineHeight: 1.5,
                      margin: 0,
                      maxWidth: 720,
                      fontFamily: 'var(--serif)',
                      fontStyle: 'italic',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {a.description}
                  </p>
                  {a.externalUrl && (
                    <a
                      href={a.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 28,
                        fontFamily: 'var(--mono)',
                        fontSize: 11.5,
                        color: 'var(--accent)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        border: '1px solid var(--accent-border)',
                        borderRadius: 999,
                        background: 'var(--accent-soft)',
                        fontWeight: 600,
                      }}
                    >
                      Original source ↗
                    </a>
                  )}
                </div>

                {/* MDX body */}
                <div className="growth-prose">
                  <MDXRemote
                    source={a.content}
                    components={mdxComponents}
                    options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                  />
                </div>

                {/* Inline navigation: prev / next */}
                <div
                  style={{
                    marginTop: 56,
                    paddingTop: 24,
                    borderTop: '1px solid var(--rule)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {idx > 0 ? (
                    <a
                      href={`#deep-dive-${deepDives[idx - 1].slug}`}
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        maxWidth: '46%',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.14em',
                          color: 'var(--ink-faint)',
                        }}
                      >
                        ← Previous
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--serif)',
                          fontSize: 16,
                          color: 'var(--ink)',
                          letterSpacing: '-0.012em',
                        }}
                      >
                        {deepDives[idx - 1].eventTitle}
                      </span>
                    </a>
                  ) : (
                    <span />
                  )}
                  {idx < deepDives.length - 1 ? (
                    <a
                      href={`#deep-dive-${deepDives[idx + 1].slug}`}
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        textAlign: 'right',
                        maxWidth: '46%',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.14em',
                          color: 'var(--ink-faint)',
                        }}
                      >
                        Next →
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--serif)',
                          fontSize: 16,
                          color: 'var(--ink)',
                          letterSpacing: '-0.012em',
                        }}
                      >
                        {deepDives[idx + 1].eventTitle}
                      </span>
                    </a>
                  ) : (
                    <a
                      href="#top"
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        textAlign: 'right',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.14em',
                          color: 'var(--ink-faint)',
                        }}
                      >
                        ↑ Back to top
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--rule)',
          padding: '32px 0',
          background: 'var(--bg-card)',
        }}
      >
        <div
          className="shell"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Link href="/" className="detail-back" style={{ marginBottom: 0 }}>
            ← GrowthHunt
          </Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}

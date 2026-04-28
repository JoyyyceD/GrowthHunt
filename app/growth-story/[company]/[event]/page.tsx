import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import {
  getEventArticle,
  getAllCompanies,
  getAllEventSlugs,
  getStory,
} from '@/lib/growth-story'
import { mdxComponents } from '@/lib/growth-story-mdx'

interface Props {
  params: Promise<{ company: string; event: string }>
}

export async function generateStaticParams() {
  const params: { company: string; event: string }[] = []
  for (const company of getAllCompanies()) {
    for (const event of getAllEventSlugs(company)) {
      params.push({ company, event })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company, event } = await params
  const article = getEventArticle(company, event)
  if (!article) return {}
  const url = `https://growthhunt.ai/growth-story/${company}/${event}`
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: article.title,
      description: article.description,
      publishedTime: article.date,
    },
    twitter: { card: 'summary_large_image', title: article.title, description: article.description },
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

export default async function EventPage({ params }: Props) {
  const { company, event } = await params
  const article = getEventArticle(company, event)
  if (!article) notFound()

  const story = getStory(company)
  const siblings = story?.timeline.events.filter(e => e.articleSlug && e.articleSlug !== event) ?? []

  return (
    <div>
      <nav className="top">
        <div className="shell row">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
            <div className="mark" />
            GrowthHunt
          </Link>
          <Link
            href={`/growth-story/${company}`}
            className="detail-back"
            style={{ marginBottom: 0 }}
          >
            ← Back to {story?.timeline.company.name ?? company}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 0 56px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell" style={{ maxWidth: 880 }}>
          <Link
            href={`/growth-story/${company}`}
            className="detail-back"
            style={{ marginBottom: 24, display: 'inline-flex' }}
          >
            ← {story?.timeline.company.name ?? company} growth story
          </Link>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            <span
              className="tag"
              style={{
                color: TYPE_COLOR[article.type],
                borderColor: 'transparent',
                background: 'var(--bg-card)',
              }}
            >
              {TYPE_LABEL[article.type]}
            </span>
            {article.gtmTag && <span className="tag">{article.gtmTag}</span>}
            <span className="tag">{article.date}</span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(40px, 5.5vw, 78px)',
              lineHeight: 0.98,
              letterSpacing: '-0.032em',
              fontWeight: 400,
              margin: '0 0 28px',
            }}
          >
            {article.title}
          </h1>
          <p
            style={{
              fontSize: 21,
              color: 'var(--ink-dim)',
              lineHeight: 1.5,
              margin: 0,
              maxWidth: 720,
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              letterSpacing: '-0.005em',
            }}
          >
            {article.description}
          </p>
          {article.externalUrl && (
            <a
              href={article.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 32,
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textDecoration: 'none',
                padding: '10px 18px',
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
      </section>

      {/* Body */}
      <section style={{ padding: '72px 0 88px' }}>
        <div className="shell" style={{ maxWidth: 720 }}>
          <MDXRemote source={article.content} components={mdxComponents} />
        </div>
      </section>

      {/* Sibling deep dives */}
      {siblings.length > 0 && (
        <section
          style={{
            padding: '72px 0',
            borderTop: '1px solid var(--rule)',
            background: 'var(--bg-card)',
          }}
        >
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              <span className="dot" />
              More deep dives
            </div>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 36,
                fontWeight: 400,
                letterSpacing: '-0.025em',
                margin: '0 0 32px',
              }}
            >
              Other key moments
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 1,
                background: 'var(--rule)',
                border: '1px solid var(--rule)',
              }}
            >
              {siblings.map(e => (
                <Link
                  key={e.articleSlug}
                  href={`/growth-story/${company}/${e.articleSlug}`}
                  className="blog-card"
                  style={{ textDecoration: 'none', display: 'block', background: 'var(--bg)' }}
                >
                  <article
                    style={{
                      padding: '28px',
                      minHeight: 180,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
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
                        fontSize: 22,
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                        fontWeight: 400,
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {e.title}
                    </h3>
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
          <Link
            href={`/growth-story/${company}`}
            className="detail-back"
            style={{ marginBottom: 0 }}
          >
            ← {story?.timeline.company.name ?? company} growth story
          </Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}

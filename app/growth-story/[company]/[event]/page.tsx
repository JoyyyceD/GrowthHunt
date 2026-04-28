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

const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '56px 0 16px' }} {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2, margin: '32px 0 12px' }} {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--ink-dim)', margin: '0 0 22px' }} {...props} />
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
    <blockquote style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 24, margin: '36px 0', fontFamily: 'var(--serif)', fontSize: 22, fontStyle: 'italic', color: 'var(--ink-dim)', lineHeight: 1.5 }} {...props} />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: 'auto', margin: '0 0 24px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'var(--mono)' }} {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--rule-strong)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)', background: 'var(--bg-card)' }} {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule)', color: 'var(--ink-dim)' }} {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code style={{ fontFamily: 'var(--mono)', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 4, padding: '2px 6px', color: 'var(--ink)' }} {...props} />
  ),
  hr: () => <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '48px 0' }} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }} {...props} />
  ),
}

export default async function EventPage({ params }: Props) {
  const { company, event } = await params
  const article = getEventArticle(company, event)
  if (!article) notFound()

  const story = getStory(company)

  // Find sibling deep-dive articles for "more deep dives" footer
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
      <section style={{ padding: '64px 0 48px', borderBottom: '1px solid var(--rule)' }}>
        <div className="shell" style={{ maxWidth: 800 }}>
          <Link href={`/growth-story/${company}`} className="detail-back">
            ← {story?.timeline.company.name ?? company} growth story
          </Link>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
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
              fontSize: 'clamp(36px, 5vw, 64px)',
              lineHeight: 1.02,
              letterSpacing: '-0.028em',
              fontWeight: 400,
              margin: '0 0 24px',
            }}
          >
            {article.title}
          </h1>
          <p style={{ fontSize: 19, color: 'var(--ink-dim)', lineHeight: 1.55, margin: 0, maxWidth: 660 }}>
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
                gap: 8,
                marginTop: 28,
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                textDecoration: 'none',
                padding: '8px 14px',
                border: '1px solid var(--accent-border)',
                borderRadius: 999,
                background: 'var(--accent-soft)',
              }}
            >
              View original source ↗
            </a>
          )}
        </div>
      </section>

      {/* Body */}
      <section style={{ padding: '64px 0 80px' }}>
        <div className="shell" style={{ maxWidth: 720 }}>
          <MDXRemote source={article.content} components={mdxComponents} />
        </div>
      </section>

      {/* Sibling deep dives */}
      {siblings.length > 0 && (
        <section style={{ padding: '64px 0', borderTop: '1px solid var(--rule)', background: 'var(--bg-card)' }}>
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              <span className="dot" />
              More deep dives
            </div>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: '-0.022em',
                margin: '0 0 28px',
              }}
            >
              Other key moments
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
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
                  <article style={{ padding: '24px', minHeight: 160, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                        fontSize: 20,
                        lineHeight: 1.2,
                        letterSpacing: '-0.018em',
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

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--rule)', padding: '24px 0', background: 'var(--bg-card)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href={`/growth-story/${company}`} className="detail-back" style={{ marginBottom: 0 }}>
            ← {story?.timeline.company.name ?? company} growth story
          </Link>
          <span className="eyebrow">© 2026 GrowthHunt Labs</span>
        </div>
      </footer>
    </div>
  )
}

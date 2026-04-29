import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getChampionWithComments } from '../_lib/fetch'
import VoteButton from '../_client/VoteButton'
import CommentBox from '../_client/CommentBox'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getChampionWithComments(slug)
  if (!data) return {}
  const { champion } = data
  const url = `https://growthhunt.ai/opchampion/${slug}`
  return {
    title: `${champion.name} — ${champion.tagline}`,
    description: champion.about ?? champion.tagline,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${champion.name} — OPChampion`,
      description: champion.about ?? champion.tagline,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${champion.name} — OPChampion`,
      description: champion.about ?? champion.tagline,
    },
  }
}

function Logo({ name, hue, size = 72 }: { name: string; hue: string | null; size?: number }) {
  const initials = name.split(/[\s.]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="champion-logo"
      style={{
        background: hue ?? 'var(--accent)',
        width: size, height: size,
        fontSize: size * 0.36,
      }}
    >
      <span>{initials}</span>
    </div>
  )
}

export default async function OpChampionDetail({ params }: Props) {
  const { slug } = await params
  const data = await getChampionWithComments(slug)
  if (!data) notFound()

  const { champion, comments } = data

  // SEO — Product + Article hybrid markup, telling Google this is a real
  // listing AND providing dofollow attribution to the company's site.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${champion.name} — ${champion.tagline}`,
    description: champion.about ?? champion.tagline,
    datePublished: new Date(champion.submittedAt).toISOString(),
    author: { '@type': 'Person', name: champion.by ?? 'Solo founder' },
    publisher: {
      '@type': 'Organization',
      name: 'GrowthHunt — OPChampion',
      url: 'https://growthhunt.ai/opchampion',
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://growthhunt.ai/opchampion/${slug}` },
    about: champion.url ? { '@type': 'WebSite', url: champion.url, name: champion.name } : undefined,
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="opc-section" style={{ padding: '64px 0 32px' }}>
        <div className="shell" style={{ maxWidth: 760 }}>
          <Link href="/opchampion" style={{ display: 'inline-block', marginBottom: 32, fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none', fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ← All champions
          </Link>

          {/* Hero */}
          <div className="champion-row detail">
            <Logo name={champion.name} hue={champion.hue} size={72} />
            <div className="row-meta">
              <div className="row-head">
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>{champion.name}</h3>
                {champion.status === 'Soon' && <span className="row-pill soon">Coming soon</span>}
                {champion.featured && <span className="row-pill featured">Editor&rsquo;s pick</span>}
              </div>
              <div className="row-by">
                by {champion.by ?? 'Solo founder'}
                {champion.founderType && <> · <i style={{ color: 'var(--ink-faint)' }}>{champion.founderType}</i></>}
                {champion.category && <> · {champion.category}</>}
              </div>
              <div className="row-tagline">{champion.tagline}</div>
            </div>
            <div className="row-actions">
              <VoteButton slug={champion.id} initialCount={champion.upvotes} />
              {champion.url && (
                // Dofollow → real backlink benefit for the featured company
                <a
                  href={champion.url}
                  target="_blank"
                  rel="noopener"
                  className="visit-btn"
                  aria-label={`Visit ${champion.name}`}
                  title={`Visit ${champion.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* About — also visible to bots = part of the page index */}
          {champion.about && (
            <div style={{ marginTop: 36 }}>
              <h4 style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>
                About
              </h4>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--ink-dim)', margin: 0 }}>
                {champion.about}
              </p>
            </div>
          )}

          {champion.url && (
            <div style={{ marginTop: 32, padding: '20px 24px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--rule)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Visit
              </div>
              <a
                href={champion.url}
                target="_blank"
                rel="noopener"
                style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', wordBreak: 'break-all' }}
              >
                {champion.url.replace(/^https?:\/\//, '')} ↗
              </a>
            </div>
          )}

          {/* Comments — interactive client component */}
          <div style={{ marginTop: 56 }}>
            <CommentBox slug={slug} initialComments={comments} />
          </div>
        </div>
      </section>
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getChampionWithComments } from '../_lib/fetch'
import VoteButton from '../_client/VoteButton'
import CommentBox from '../_client/CommentBox'
import OwnerEditButton from '../_client/OwnerEditButton'

// ISR — cache rendered HTML for 5 min so bots (and most visitors) hit a
// pre-rendered page instead of running a DB query per request.
export const revalidate = 300

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getChampionWithComments(slug)
  if (!data) return {}
  const { champion } = data
  const url = `https://growthhunt.ai/picolaunch/${slug}`
  // Keep <title> under Google's ~60-char SERP cap so it doesn't get truncated mid-tagline.
  const TITLE_MAX = 60
  const fullTitle = `${champion.name} — ${champion.tagline}`
  const title = fullTitle.length > TITLE_MAX
    ? `${champion.name} — ${champion.tagline.slice(0, Math.max(20, TITLE_MAX - champion.name.length - 4)).trimEnd()}…`
    : fullTitle
  return {
    title,
    description: champion.about ?? champion.tagline,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${champion.name} — PicoLaunch`,
      description: champion.about ?? champion.tagline,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${champion.name} — PicoLaunch`,
      description: champion.about ?? champion.tagline,
    },
  }
}

function Logo({
  name,
  hue,
  logoUrl,
  size = 72,
}: {
  name: string
  hue: string | null
  logoUrl: string | null
  size?: number
}) {
  if (logoUrl) {
    return (
      <div className="logo-mark" style={{ width: size, height: size }}>
        {/* Logo URLs come from arbitrary sources (seed data, user input, brand
            CDNs) — keep as raw <img> so next/image's domain allowlist can't
            block them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          loading="eager"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }
  const initials = name.split(/[\s.]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="logo-mark logo-fallback"
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

export default async function PicoLaunchDetail({ params }: Props) {
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
    author: { '@type': 'Person', name: champion.by ?? 'Founder' },
    publisher: {
      '@type': 'Organization',
      name: 'GrowthHunt — PicoLaunch',
      url: 'https://growthhunt.ai/picolaunch',
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://growthhunt.ai/picolaunch/${slug}` },
    about: champion.url ? { '@type': 'WebSite', url: champion.url, name: champion.name } : undefined,
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GrowthHunt', item: 'https://growthhunt.ai' },
      { '@type': 'ListItem', position: 2, name: 'PicoLaunch', item: 'https://growthhunt.ai/picolaunch' },
      { '@type': 'ListItem', position: 3, name: champion.name, item: `https://growthhunt.ai/picolaunch/${slug}` },
    ],
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="opc-section" style={{ padding: '64px 0 32px' }}>
        <div className="shell" style={{ maxWidth: 760 }}>
          <Link href="/picolaunch" style={{ display: 'inline-block', marginBottom: 32, fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none', fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ← All launches
          </Link>

          {/* Hero */}
          <div className="champion-row detail">
            <Logo name={champion.name} hue={champion.hue} logoUrl={champion.logoUrl} size={72} />
            <div className="row-meta">
              <div className="row-head">
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>{champion.name}</h3>
                {champion.status === 'Soon' && <span className="row-pill soon">Coming soon</span>}
                {champion.featured && <span className="row-pill featured">Editor&rsquo;s pick</span>}
              </div>
              <div className="row-by">
                by {champion.by ?? 'Founder'}
                {champion.founderType && <> · <i style={{ color: 'var(--ink-faint)' }}>{champion.founderType}</i></>}
                {champion.category && <> · {champion.category}</>}
              </div>
              <div className="row-tagline">{champion.tagline}</div>
            </div>
            <div className="row-actions">
              <OwnerEditButton slug={slug} ownerId={champion.ownerId} />
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

          {/* Screenshots — surface uploaded media right under the hero */}
          {(champion.image1Url || champion.image2Url) && (
            <div className="screenshot-grid" style={{ marginTop: 36 }}>
              {champion.image1Url && (
                <div className="screenshot-frame">
                  <Image
                    src={champion.image1Url}
                    alt={`${champion.name} screenshot 1`}
                    fill
                    sizes="(max-width: 760px) 100vw, 372px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              {champion.image2Url && (
                <div className="screenshot-frame">
                  <Image
                    src={champion.image2Url}
                    alt={`${champion.name} screenshot 2`}
                    fill
                    sizes="(max-width: 760px) 100vw, 372px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>
          )}

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

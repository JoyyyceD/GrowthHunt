import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getLeaderboard, type LeaderboardRange } from './_lib/fetch'
import VoteButton from './_client/VoteButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'PicoLaunch — Launch your AI startup, get a real backlink',
  description:
    'The AI startup leaderboard. Free dofollow backlink to your site, ranked forever by community upvotes and comments. No waitlist, no review queue.',
  alternates: { canonical: 'https://growthhunt.ai/picolaunch' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/picolaunch',
    title: 'PicoLaunch — Launch your AI startup. Get a real backlink.',
    description:
      'The AI startup leaderboard. Free, dofollow, permanent. Ranked by community upvotes and comments.',
  },
}

const RANGE_TABS: { key: LeaderboardRange; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: 'week', label: 'This week' },
  { key: 'new', label: 'New' },
]

function Logo({
  name,
  hue,
  logoUrl,
}: {
  name: string
  hue: string | null
  logoUrl: string | null
}) {
  if (logoUrl) {
    return (
      <div className="logo-mark">
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={48}
          height={48}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }
  const initials = name
    .split(/[\s.]+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className="logo-mark logo-fallback"
      style={{ background: hue ?? 'var(--accent)' }}
    >
      <span>{initials}</span>
    </div>
  )
}

interface Props {
  searchParams: Promise<{ range?: string }>
}

export default async function PicoLaunchHome({ searchParams }: Props) {
  const params = await searchParams
  const range = (RANGE_TABS.find(t => t.key === params.range)?.key ?? 'all') as LeaderboardRange
  const champions = await getLeaderboard(range)
  const featured = champions.filter(c => c.featured)
  const standard = champions.filter(c => !c.featured)

  // SEO structured data — ItemList for the leaderboard
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'PicoLaunch — AI startup leaderboard',
    itemListElement: champions.slice(0, 50).map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://growthhunt.ai/picolaunch/${c.id}`,
      name: c.name,
    })),
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Page header */}
      <header className="opc-header">
        <div className="shell">
          <div className="eyebrow">
            <span className="dot" />For AI startups · free dofollow backlink
          </div>
          <h1>
            Launch your AI startup.
            <br />
            <em>Get a real backlink.</em>
          </h1>
          <p className="opc-sub">
            <b>PicoLaunch</b> is the always-on AI startup leaderboard — submit in 60 seconds,
            ranked forever by community upvotes and comments. Every approved listing earns a
            permanent dofollow backlink to your site. Free, no waitlist, no review queue.
          </p>
        </div>
      </header>

      {/* Editor's picks — no count limit, anything with featured = true lands here */}
      {featured.length > 0 && (
        <section className="opc-section">
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 24 }}>
              <span className="dot" />Editor&rsquo;s picks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {featured.map((c, i) => (
                <ChampionRow key={c.id} champion={c} rank={i + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Leaderboard with range tabs */}
      <section
        className="opc-section"
        style={{ paddingTop: featured.length > 0 ? 56 : 28 }}
      >
        <div className="shell">
          <div className="filter-bar">
            <div className="eyebrow">
              <span className="dot" />Leaderboard ·{' '}
              <span style={{ color: 'var(--ink-faint)' }}>
                ranked by upvotes + comments
              </span>
            </div>
            <div className="filter-tabs">
              {RANGE_TABS.map(t => (
                <Link
                  key={t.key}
                  href={t.key === 'all' ? '/picolaunch' : `/picolaunch?range=${t.key}`}
                  className={range === t.key ? 'on' : ''}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          {standard.length === 0 ? (
            <p className="opc-sub" style={{ marginTop: 24 }}>
              No launches in this range yet — try a wider window above.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {standard.map((c, i) => (
                <ChampionRow key={c.id} champion={c} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Empty state — no champions at all */}
      {champions.length === 0 && (
        <section className="opc-section">
          <div className="shell">
            <p className="opc-sub">
              Nothing live yet. Be the first —{' '}
              <Link
                href="/picolaunch/submit"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                submit your AI startup
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      {/* CTA */}
      <section
        className="opc-section"
        style={{
          padding: '72px 0',
          borderTop: '1px solid var(--rule)',
          marginTop: 56,
        }}
      >
        <div className="shell">
          <div className="eyebrow">
            <span className="dot" />For AI founders
          </div>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              margin: '14px 0 18px',
              lineHeight: 1.05,
            }}
          >
            Shipping <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>AI?</em> Show it.
          </h2>
          <p className="opc-sub" style={{ marginBottom: 24 }}>
            Auto-published. No review queue. Free dofollow backlink. Edit anytime.
          </p>
          <Link
            href="/picolaunch/submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              padding: '14px 24px',
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Submit your AI startup →
          </Link>
        </div>
      </section>
    </div>
  )
}

function ChampionRow({
  champion,
  rank,
}: {
  champion: Awaited<ReturnType<typeof getLeaderboard>>[number]
  rank?: number
}) {
  return (
    <div className="champion-row" style={{ position: 'relative' }}>
      {/* Overlay link — entire card click area routes to detail page */}
      <Link
        href={`/picolaunch/${champion.id}`}
        aria-label={`Open ${champion.name}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />
      {rank && <div className="row-rank mono">{String(rank).padStart(2, '0')}</div>}
      <Logo name={champion.name} hue={champion.hue} logoUrl={champion.logoUrl} />
      <div className="row-meta">
        <div className="row-head">
          <h3>{champion.name}</h3>
          {champion.status === 'Soon' && (
            <span className="row-pill soon">Coming soon</span>
          )}
          {champion.featured && (
            <span className="row-pill featured">Editor&rsquo;s pick</span>
          )}
        </div>
        <div className="row-by">
          by {champion.by ?? 'Founder'} ·{' '}
          {champion.founderType ? (
            <i style={{ color: 'var(--ink-faint)' }}>{champion.founderType}</i>
          ) : (
            champion.category
          )}
        </div>
        <div className="row-tagline">{champion.tagline}</div>
      </div>
      <div className="row-actions" style={{ position: 'relative', zIndex: 2 }}>
        <VoteButton slug={champion.id} initialCount={champion.upvotes} />
        <span
          className="comment-btn"
          style={{ cursor: 'default' }}
          aria-label={`${champion.comments} comments`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>{champion.comments}</span>
        </span>
        {champion.url && (
          // dofollow external link → SEO benefit for the featured company
          <a
            href={champion.url}
            target="_blank"
            rel="noopener"
            className="visit-btn"
            aria-label={`Visit ${champion.name}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

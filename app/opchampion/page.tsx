import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllChampions } from './_lib/fetch'
import VoteButton from './_client/VoteButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OPChampion — One-person companies, one issue a week',
  description:
    'A weekly launch board for one-person companies — indie hackers, freelancers, and solo founders shipping real things. Twelve picks every Monday. Upvote, comment, follow.',
  alternates: { canonical: 'https://growthhunt.ai/opchampion' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/opchampion',
    title: 'OPChampion — A weekly launch board for one-person companies',
    description: 'Twelve solo-founder picks every Monday. Upvote, comment, follow.',
  },
}

function Logo({ name, hue }: { name: string; hue: string | null }) {
  const initials = name.split(/[\s.]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="champion-logo" style={{ background: hue ?? 'var(--accent)' }}>
      <span>{initials}</span>
    </div>
  )
}

export default async function OpChampionHome() {
  const champions = await getAllChampions('hot')
  const featured = champions.filter(c => c.featured)
  const standard = champions.filter(c => !c.featured)

  // SEO structured data — ItemList for the listing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'OPChampion — One-person companies launch board',
    itemListElement: champions.slice(0, 50).map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://growthhunt.ai/opchampion/${c.id}`,
      name: c.name,
    })),
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Page header */}
      <header className="opc-header">
        <div className="shell">
          <div className="eyebrow"><span className="dot" />Curated weekly · For solo founders</div>
          <h1>One-person <em>companies,</em><br />one issue a week.</h1>
          <p className="opc-sub">
            <b>OPChampion</b> is GrowthHunt&rsquo;s launch board for one-person companies — the indie hackers,
            freelancers, and solo founders shipping real things. Twelve picks each Monday. Upvote,
            comment, follow.
          </p>
        </div>
      </header>

      {/* Editor's picks */}
      {featured.length > 0 && (
        <section className="opc-section">
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />Editor&rsquo;s picks · this week</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {featured.map((c, i) => (
                <ChampionRow key={c.id} champion={c} rank={i + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Standard launches */}
      {standard.length > 0 && (
        <section className="opc-section" style={{ paddingTop: featured.length > 0 ? 56 : 28 }}>
          <div className="shell">
            <div className="eyebrow" style={{ marginBottom: 24 }}><span className="dot" />Standard launches</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {standard.map((c) => (
                <ChampionRow key={c.id} champion={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {champions.length === 0 && (
        <section className="opc-section">
          <div className="shell">
            <p className="opc-sub">No champions yet — check back Monday.</p>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="opc-section" style={{ padding: '72px 0', borderTop: '1px solid var(--rule)', marginTop: 56 }}>
        <div className="shell">
          <div className="eyebrow"><span className="dot" />For one-person companies</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '14px 0 18px', lineHeight: 1.05 }}>
            Built it <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>solo?</em> Show it.
          </h2>
          <p className="opc-sub" style={{ marginBottom: 24 }}>
            Auto-published. No review queue. Edit anytime. Sign in once with Google — your email is your identity.
          </p>
          <a
            href="mailto:hi@growthhunt.ai?subject=Submit%20my%20OPC"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Email us to submit →
          </a>
          <p style={{ marginTop: 12, color: 'var(--ink-faint)', fontSize: 12 }}>
            (Self-serve submit form coming soon — for now, send us your URL + tagline.)
          </p>
        </div>
      </section>
    </div>
  )
}

function ChampionRow({ champion, rank }: { champion: Awaited<ReturnType<typeof getAllChampions>>[number]; rank?: number }) {
  return (
    <div className="champion-row">
      {rank && <div className="row-rank mono">{String(rank).padStart(2, '0')}</div>}
      <Logo name={champion.name} hue={champion.hue} />
      <div className="row-meta">
        <div className="row-head">
          <Link href={`/opchampion/${champion.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <h3>{champion.name}</h3>
          </Link>
          {champion.status === 'Soon' && <span className="row-pill soon">Coming soon</span>}
          {champion.featured && <span className="row-pill featured">Editor&rsquo;s pick</span>}
        </div>
        <div className="row-by">
          by {champion.by ?? 'Solo founder'} ·{' '}
          {champion.founderType
            ? <i style={{ color: 'var(--ink-faint)' }}>{champion.founderType}</i>
            : champion.category}
        </div>
        <div className="row-tagline">{champion.tagline}</div>
      </div>
      <div className="row-actions">
        <VoteButton slug={champion.id} initialCount={champion.upvotes} />
        <Link href={`/opchampion/${champion.id}`} className="comment-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span>{champion.comments}</span>
        </Link>
        {champion.url && (
          // dofollow external link → SEO benefit for the featured company
          <a href={champion.url} target="_blank" rel="noopener" className="visit-btn" aria-label={`Visit ${champion.name}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        )}
      </div>
    </div>
  )
}

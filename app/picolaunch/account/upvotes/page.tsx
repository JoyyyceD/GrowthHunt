import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { requireGoogleAuth } from '@/lib/picolaunch/auth-gate'
import { championToDTO } from '@/lib/opc-mappers'
import type { ChampionRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

export default async function UpvotesPage() {
  const user = await requireGoogleAuth('/picolaunch/account/upvotes')
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('votes')
    .select('created_at, champion:champions!champion_id(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) console.error('[account/upvotes]', error)

  const rows = (data ?? []) as unknown as Array<{
    created_at: string
    champion: ChampionRow | null
  }>

  const champions = rows
    .map(r => r.champion)
    .filter((c): c is ChampionRow => !!c && c.deleted_at == null)
    .map(championToDTO)

  if (champions.length === 0) {
    return (
      <EmptyState
        title="No upvotes yet."
        body="Find launches you like on PicoLaunch and click the upvote button."
        cta={{ href: '/picolaunch', label: 'Browse launches →' }}
      />
    )
  }

  return (
    <>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 16,
        }}
      >
        {champions.length} upvoted
      </div>
      <div className="champion-list">
        {champions.map(c => (
          <Link
            key={c.uuid}
            href={`/picolaunch/${c.id}`}
            className="champion-row"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Logo name={c.name} hue={c.hue} logoUrl={c.logoUrl} />
            <div className="row-meta">
              <div className="row-head">
                <h3>{c.name}</h3>
                {c.status === 'Soon' && <span className="row-pill soon">Coming soon</span>}
              </div>
              <div className="row-by">
                ↑ {c.upvotes} · 💬 {c.comments}
                {c.category && <> · {c.category}</>}
              </div>
              <div className="row-tagline">{c.tagline}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
    <div className="logo-mark logo-fallback" style={{ background: hue ?? 'var(--accent)' }}>
      {initials}
    </div>
  )
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string
  body: string
  cta: { href: string; label: string }
}) {
  return (
    <div
      style={{
        padding: '64px 24px',
        textAlign: 'center',
        background: 'var(--bg-elev)',
        border: '1px solid var(--rule)',
        borderRadius: 12,
      }}
    >
      <p
        className="serif"
        style={{ fontSize: 28, fontStyle: 'italic', margin: '0 0 8px', fontWeight: 400 }}
      >
        {title}
      </p>
      <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 24px' }}>{body}</p>
      <Link
        href={cta.href}
        style={{
          display: 'inline-flex',
          background: 'var(--ink)',
          color: 'var(--bg)',
          padding: '12px 22px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        {cta.label}
      </Link>
    </div>
  )
}

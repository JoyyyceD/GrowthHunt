import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { requireGoogleAuth } from '@/lib/picolaunch/auth-gate'
import { championToDTO } from '@/lib/opc-mappers'
import type { ChampionRow } from '@/lib/opc-types'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

export default async function MyLaunchesPage() {
  const user = await requireGoogleAuth('/picolaunch/account/launches')
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('champions')
    .select('*')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[account/launches]', error)
  }

  const launches = ((data ?? []) as ChampionRow[]).map(championToDTO)

  if (launches.length === 0) {
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
          No launches yet.
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 24px' }}>
          Submit your first AI startup. Auto-published, edit anytime.
        </p>
        <Link
          href="/picolaunch/submit"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--ink)',
            color: 'var(--bg)',
            padding: '12px 22px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Submit a launch →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {launches.length} {launches.length === 1 ? 'launch' : 'launches'}
        </span>
        <Link
          href="/picolaunch/submit"
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          + New launch
        </Link>
      </div>

      <div className="champion-list">
        {launches.map(c => (
          <div key={c.uuid} className="champion-row" style={{ position: 'relative' }}>
            <Link
              href={`/picolaunch/${c.id}`}
              aria-label={`Open ${c.name}`}
              style={{ position: 'absolute', inset: 0, zIndex: 1 }}
            />
            <Logo name={c.name} hue={c.hue} logoUrl={c.logoUrl} />
            <div className="row-meta">
              <div className="row-head">
                <h3>{c.name}</h3>
                {c.status === 'Soon' && <span className="row-pill soon">Coming soon</span>}
                {c.featured && <span className="row-pill featured">Editor&rsquo;s pick</span>}
              </div>
              <div className="row-by">
                ↑ {c.upvotes} · 💬 {c.comments}
                {c.category && <> · {c.category}</>}
              </div>
              <div className="row-tagline">{c.tagline}</div>
            </div>
            <div className="row-actions" style={{ position: 'relative', zIndex: 2 }}>
              <Link
                href={`/picolaunch/${c.id}/edit`}
                className="comment-btn"
                style={{ textDecoration: 'none' }}
              >
                Edit
              </Link>
              <DeleteButton slug={c.id} name={c.name} />
            </div>
          </div>
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
        <img src={logoUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
      {initials}
    </div>
  )
}

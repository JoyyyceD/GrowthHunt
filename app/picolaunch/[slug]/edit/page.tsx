import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { requireGoogleAuth } from '@/lib/picolaunch/auth-gate'
import { createServerClient } from '@/lib/supabase/server'
import { championToDTO } from '@/lib/opc-mappers'
import type { ChampionRow } from '@/lib/opc-types'
import EditForm from './EditForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit launch — PicoLaunch',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditPage({ params }: Props) {
  const { slug } = await params
  const user = await requireGoogleAuth(`/picolaunch/${slug}/edit`)

  const supabase = await createServerClient()
  const { data: row, error } = await supabase
    .from('champions')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !row) notFound()
  const champion = row as ChampionRow

  if (champion.owner_id !== user.id) {
    redirect(`/picolaunch/${slug}`)
  }

  return (
    <div>
      <TopNav variant="page" />
      <section className="opc-section" style={{ padding: '64px 0 32px' }}>
        <div className="shell" style={{ maxWidth: 720 }}>
          <Link
            href={`/picolaunch/${slug}`}
            style={{
              display: 'inline-block',
              marginBottom: 24,
              fontSize: 13,
              color: 'var(--ink-faint)',
              textDecoration: 'none',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            ← Back to launch
          </Link>

          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              fontWeight: 400,
              margin: '0 0 14px',
            }}
          >
            Edit <em style={{ color: 'var(--accent)' }}>{champion.name}</em>
          </h1>
          <p className="opc-sub" style={{ marginBottom: 32 }}>
            Changes save immediately. New images replace existing ones.
          </p>

          <EditForm initial={championToDTO(champion)} />
        </div>
      </section>
    </div>
  )
}

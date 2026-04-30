import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { TopNav } from '@/lib/site/TopNav'
import { DEFAULT_PLAN } from '../../calendar'
import { classifyBlurb } from '@/lib/viralx/classify'
import { fetchExemplars, type Exemplar } from '@/lib/viralx/exemplars'
import DayCard from './DayCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your 14-day plan — ViralX',
  description: 'Day-by-day launch posts pulled from the Xhunter corpus.',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ViralxSessionPage({ params }: PageProps) {
  const { id } = await params
  const sb = await createServerClient()

  const { data: { user } } = await sb.auth.getUser()
  if (!user) notFound()

  const { data: session } = await sb
    .from('viralx_sessions')
    .select('id, handle, startup_blurb, start_date, status, created_at')
    .eq('id', id)
    .maybeSingle()
  if (!session) notFound()

  const { data: dayRows } = await sb
    .from('viralx_calendar_days')
    .select('day_number, archetype, content_text, scheduled_at, posted_at, x_post_id, failed_at, failure_reason')
    .eq('session_id', id)
  type StoredDay = NonNullable<typeof dayRows>[number]
  const dayMap = new Map<number, StoredDay>()
  for (const r of dayRows ?? []) dayMap.set(r.day_number, r)

  const { data: creds } = await sb
    .from('viralx_x_credentials')
    .select('x_screen_name')
    .eq('user_id', user.id)
    .maybeSingle()
  const hasCredentials = !!creds

  const category = classifyBlurb(session.startup_blurb)
  const exemplarsByDay: Record<number, Exemplar[]> = {}
  await Promise.all(
    DEFAULT_PLAN.map(async d => {
      const stored = dayMap.get(d.day)
      const archetype = stored?.archetype || d.archetype
      exemplarsByDay[d.day] = await fetchExemplars(sb, { category, archetype })
    })
  )

  return (
    <>
      <TopNav variant="page" />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 96px' }}>
        <header style={{ marginBottom: 32 }}>
          <p
            style={{
              fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)',
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px',
            }}
          >
            Viralx · 14-day plan for @{session.handle}
            {category && <> · category: <strong style={{ color: 'var(--ink-dim)' }}>{category}</strong></>}
          </p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1.1, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            {session.startup_blurb}
          </h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, margin: 0 }}>
            Click <strong>Generate</strong> on any day to draft via MiniMax, edit inline, then{' '}
            <strong>Post to X</strong>.{' '}
            {hasCredentials ? (
              <Link href="/viralx/credentials" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                X creds saved · manage
              </Link>
            ) : (
              <Link href="/viralx/credentials" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                Add X credentials to enable posting →
              </Link>
            )}
            {' · '}
            <Link href="/viralx/start" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
              start over
            </Link>
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 16,
          }}
        >
          {DEFAULT_PLAN.map(d => (
            <DayCard
              key={d.day}
              sessionId={session.id}
              plan={d}
              stored={dayMap.get(d.day) ?? null}
              exemplars={exemplarsByDay[d.day] ?? []}
              hasCredentials={hasCredentials}
            />
          ))}
        </div>
      </main>
    </>
  )
}

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listSnapshots, listDiffs } from '@/lib/agents/competitor'
import { CompetitorRunner } from './CompetitorRunner'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Competitor Watch — GrowthHunt',
  description: 'Weekly snapshots of competitor pages. AI surfaces meaningful changes — pricing, copy rewrites, new sections.',
}

export default async function CompetitorPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/competitor')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  const [snapshots, diffs] = await Promise.all([listSnapshots(active.id), listDiffs(active.id)])

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 960 }}>
          <div className="eyebrow"><span className="dot" />Competitor Watch · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            See it the day they <em>ship it</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Add competitor URLs to your <Link href={`/workspace/${active.id}`} style={{ color: 'var(--ink)' }}>workspace</Link>;
            the weekly cron snapshots each page and surfaces meaningful changes —
            pricing moves, copy rewrites, new sections. We deliberately don&apos;t fake an
            ARR estimate (that would require data we don&apos;t have).
          </p>
          <CompetitorRunner workspace={active} allWorkspaces={workspaces} initialSnapshots={snapshots} initialDiffs={diffs} />
        </div>
      </section>
    </div>
  )
}

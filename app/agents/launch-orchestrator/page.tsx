import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listCampaigns } from '@/lib/agents/launch-orchestrator'
import { LaunchList } from './LaunchList'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Launch Orchestrator — GrowthHunt',
  description: 'Run a coordinated launch across Product Hunt, HackerNews, BetaList, Indie Hackers, Reddit, Smol — per-platform checklist + copy + timing.',
}

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/launch-orchestrator')
  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/gtm')
  const campaigns = await listCampaigns(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 980 }}>
          <div className="eyebrow"><span className="dot" />Launch Orchestrator · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            One day. Six platforms. <em>Zero scrambling.</em>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            For each launch: per-platform checklists (PH hunter outreach, HN comment timing,
            Reddit subreddit picker, BetaList submission, IH milestone, Smol), copy templates
            generated in your voice, and the right time-of-day for each.
          </p>
          <LaunchList workspaceId={active.id} workspaceUrl={active.url} initialCampaigns={campaigns} />
        </div>
      </section>
    </div>
  )
}

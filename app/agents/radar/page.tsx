import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listLeads } from '@/lib/agents/radar'
import { RadarRunner } from './RadarRunner'

export const metadata: Metadata = {
  title: 'Community Radar — GrowthHunt',
  description: 'Scan Reddit and HackerNews for posts your ICP is writing right now. Scored, classified, with reply drafts in your voice.',
}

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/radar')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  const leads = await listLeads(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 960 }}>
          <div className="eyebrow"><span className="dot" />Community Radar · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Catch your ICP <em>talking</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 600 }}>
            Scans Reddit + HackerNews for posts matching your workspace, scores each for relevance,
            classifies intent (asking/complaining/comparing), drafts a helpful reply in your voice.
            v1 is manual run + manual reply — you click through to the platform to post.
          </p>
          <RadarRunner workspace={active} allWorkspaces={workspaces} initialLeads={leads} />
        </div>
      </section>
    </div>
  )
}

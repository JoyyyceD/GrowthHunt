import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listDrafts } from '@/lib/agents/creator'
import { CreatorRunner } from './CreatorRunner'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Creator Outreach Agent — GrowthHunt',
  description: 'Auto-find ≤10k creators your buyers trust, draft personalized DMs in your voice, queue them for one-click send.',
}

export default async function CreatorAgentPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/creator')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  const drafts = await listDrafts(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 980 }}>
          <div className="eyebrow"><span className="dot" />Creator Outreach · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Pitch the creators your <em>buyers trust</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 600 }}>
            Reads your workspace, scans the Xhunter dataset for creators ≤10k followers in your space,
            scores each by buyer-trust signal, drafts a personalized X DM in your voice. v1 is
            review-and-click-to-send; we open X in a new tab with the DM pre-filled.
          </p>
          <CreatorRunner workspace={active} allWorkspaces={workspaces} initialDrafts={drafts} />
        </div>
      </section>
    </div>
  )
}

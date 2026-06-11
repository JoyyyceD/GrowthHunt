import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner } from '@/lib/workspace/store'
import { WorkspaceList } from './WorkspaceList'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

const PAGE_URL = 'https://growthhunt.ai/workspace'
const TITLE = 'GTM Workspace — your shared agent brain'
const DESCRIPTION =
  'Configure your product once — name, URL, ICP, positioning, voice — and every GrowthHunt agent uses it. Stop re-entering the same context into every tool.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
}

export default async function WorkspacePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/workspace')

  const workspaces = await listWorkspacesForOwner(user.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '64px 0 32px' }}>
        <div className="shell">
          <div className="eyebrow"><span className="dot" />GTM Workspace</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 400, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '12px 0 16px', maxWidth: 800 }}>
            One <em>brain</em> for every agent.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-dim)', maxWidth: 620, lineHeight: 1.6, margin: '0 0 36px' }}>
            Configure your product here once — name, URL, ICP, positioning, voice. Every GrowthHunt agent
            (Creator Outreach, Cold Email, Landing Doctor, Community Radar, …) reads from this same
            workspace, so you never re-enter the same context.
          </p>
          <WorkspaceList initialWorkspaces={workspaces} />
          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--ink-faint)' }}>
            Want to learn what each field does? <Link href="/blog" style={{ color: 'var(--ink-dim)' }}>Read the GTM Workspace guide →</Link>
          </p>
        </div>
      </section>
    </div>
  )
}

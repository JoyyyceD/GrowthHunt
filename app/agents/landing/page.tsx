import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { LandingRunner } from './LandingRunner'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Landing Page Doctor — GrowthHunt',
  description: 'Audit your landing page for conversion. 6 dimensions, scored 0-100, with paste-ready rewrites.',
}

export default async function LandingAgentPage({ searchParams }: { searchParams: Promise<{ ws?: string; url?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/landing')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 920 }}>
          <div className="eyebrow"><span className="dot" />Landing Doctor · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Score your landing page <em>for conversion</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 580 }}>
            Six conversion dimensions — clarity, CTA, value prop, proof, friction, specificity.
            Scored 0-100 with concrete rewrites in your voice. Distinct from the GEO audit, which
            optimizes for AI citations; this is about humans converting.
          </p>
          <LandingRunner workspace={active} allWorkspaces={workspaces} initialUrl={sp.url} />
        </div>
      </section>
    </div>
  )
}

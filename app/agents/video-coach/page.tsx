import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listVideoScripts } from '@/lib/agents/video-coach'
import { VideoCoachRunner } from './VideoCoachRunner'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Video Coach — GrowthHunt',
  description: 'Not generation — direction. Shot lists, lighting checklist, recommended tools, pre-upload self-check. Cheaper, less replaceable.',
}

export default async function VideoCoachPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/video-coach')
  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/gtm')
  const scripts = await listVideoScripts(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 920 }}>
          <div className="eyebrow"><span className="dot" />Video Coach · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Director, <em>not generator</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Tell us the scenario; we hand you a 30-60s shot list with per-second VO, shot type,
            B-roll cues, on-screen text, plus a pre-shoot checklist, recommended external tools
            (CapCut/Submagic/Arcade/etc), and a 5-item pre-upload self-check.
          </p>
          <VideoCoachRunner workspace={active} initialScripts={scripts} />
        </div>
      </section>
    </div>
  )
}

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listDistributionPosts } from '@/lib/agents/distribution'
import { DistributionRunner } from './DistributionRunner'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Multi-channel Distribution — GrowthHunt',
  description: 'One post → platform-native rewrites for X, LinkedIn, Reddit, HN, Instagram, TikTok, Discord. Plus a cadence plan.',
}

export default async function DistributionPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/distribution')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  const posts = await listDistributionPosts(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 980 }}>
          <div className="eyebrow"><span className="dot" />Distribution · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            One post → <em>every platform</em>, in your voice.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Type one canonical message. Agent generates platform-native rewrites for X, LinkedIn,
            Reddit, HackerNews, Instagram, TikTok and Discord — each with its own grammar — plus
            a 48-72h cadence plan. Copy each variant with one click and paste where it goes.
          </p>
          <DistributionRunner workspace={active} allWorkspaces={workspaces} initialPosts={posts} />
        </div>
      </section>
    </div>
  )
}

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { getConnection, listCachedIntegrations, listScheduledPosts } from '@/lib/postiz/store'
import { listConnections as listNativeConnections } from '@/lib/social/store'
import { SchedulerRunner } from './SchedulerRunner'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Scheduler — GrowthHunt',
  description: 'Schedule and publish posts across every connected channel via Postiz, orchestrated from one place.',
}

export default async function SchedulerPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/scheduler')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  const [conn, integrations, posts, nativeConns, xByo] = await Promise.all([
    getConnection(active.id),
    listCachedIntegrations(active.id),
    listScheduledPosts(active.id),
    listNativeConnections(active.id),
    (async () => {
      // X is BYO: presence in viralx_x_credentials means connected for this user.
      const { data } = await supabase
        .from('viralx_x_credentials')
        .select('x_screen_name')
        .eq('user_id', user.id)
        .maybeSingle()
      return { connected: Boolean(data?.x_screen_name), screen_name: data?.x_screen_name ?? null }
    })(),
  ])
  const safeNative = nativeConns.map((c) => ({
    id: c.id, platform: c.platform, account_handle: c.account_handle, account_id: c.account_id,
    scopes: c.scopes, expires_at: c.expires_at, needs_reconnect: c.needs_reconnect, reconnect_reason: c.reconnect_reason,
  }))

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 980 }}>
          <div className="eyebrow"><span className="dot" />Scheduler · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Schedule <em>everywhere</em>, from one chat.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 640 }}>
            Connect your <strong>Postiz</strong> instance once and GrowthHunt can queue posts to X, LinkedIn,
            Reddit and 20+ channels — composed here or by the GTM agent (&ldquo;schedule this for 9am&rdquo;).
            Your queue and send history stay in sync below.
          </p>
          <SchedulerRunner
            workspace={{ id: active.id, name: active.name, url: active.url }}
            allWorkspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
            initialConnected={Boolean(conn)}
            initialApiUrl={conn?.api_url ?? 'https://api.postiz.com/public/v1'}
            initialIntegrations={integrations}
            initialPosts={posts}
            initialNativeConnections={safeNative}
            initialXByo={xByo}
          />
        </div>
      </section>
    </div>
  )
}

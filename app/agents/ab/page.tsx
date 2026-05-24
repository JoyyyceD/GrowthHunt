import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listAbTests } from '@/lib/agents/ab'
import { AbRunner } from './AbRunner'

export const metadata: Metadata = {
  title: 'A/B Lab — GrowthHunt',
  description: 'Run A/B tests on any copy variant. Tracked short URLs, automatic winner detection at p<0.05.',
}

export default async function AbPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/ab')

  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/workspace')

  const tests = await listAbTests(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 920 }}>
          <div className="eyebrow"><span className="dot" />A/B Lab · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Ship the copy that <em>actually clicks</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Paste 2-4 copy variants + a target URL. We mint a tracked short URL per variant — drop
            each in a different post, tweet, or DM. Dashboard counts clicks per variant and calls
            a winner at p&lt;0.05.
          </p>
          <AbRunner workspace={active} allWorkspaces={workspaces} initialTests={tests} />
        </div>
      </section>
    </div>
  )
}

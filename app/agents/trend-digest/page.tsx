import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { listTrendCandidates } from '@/lib/agents/trend-digest'
import { TrendRunner } from './TrendRunner'

export const metadata: Metadata = {
  title: 'Daily Trend Digest — GrowthHunt',
  description: 'Every morning: 3-8 tweets worth riding today, drafted in your voice using your TOP-performing templates.',
}

export default async function TrendDigestPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/trend-digest')
  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/gtm')
  const candidates = await listTrendCandidates(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 940 }}>
          <div className="eyebrow"><span className="dot" />Daily Digest · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Today&apos;s tweets to <em>ride</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Pulls the last 24h from your tracked handles (set <Link href={`/workspace/${active.id}`} style={{ color: 'var(--ink)' }}>competitor X URLs on the workspace</Link>),
            drafts a tweet you could post or quote-tweet in <strong>your voice</strong> using your{' '}
            <Link href={`/agents/post-roi?ws=${active.id}`} style={{ color: 'var(--ink)' }}>TOP-performing templates</Link>. Auto-runs every day 08:00 UTC.
          </p>
          <TrendRunner workspace={active} initialCandidates={candidates} />
        </div>
      </section>
    </div>
  )
}

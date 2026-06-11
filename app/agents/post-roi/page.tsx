import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, getWorkspace } from '@/lib/workspace/store'
import { latestDigest } from '@/lib/agents/post-roi'
import { PostRoiRunner } from './PostRoiRunner'

// Auth/data page — render per request; never prerender at build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Post ROI — GrowthHunt',
  description: 'Your own posts, ranked by template. Top-3 vs Bottom-3 patterns + AI-suggested angles. The opposite of "viral templates from other people".',
}

export default async function PostRoiPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/agents/post-roi')
  const workspaces = await listWorkspacesForOwner(user.id)
  if (workspaces.length === 0) redirect('/workspace')
  const active = sp.ws ? await getWorkspace(sp.ws) : workspaces[0]
  if (!active || (active.owner_id && active.owner_id !== user.id)) redirect('/gtm')
  const digest = await latestDigest(active.id)

  return (
    <div>
      <TopNav variant="page" />
      <section style={{ padding: '48px 0' }}>
        <div className="shell" style={{ maxWidth: 960 }}>
          <div className="eyebrow"><span className="dot" />Post ROI · beta</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 14px' }}>
            Your own <em>viral DNA</em>.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-dim)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Pulls your last 90 days of X posts from <Link href={`/workspace/${active.id}`} style={{ color: 'var(--ink)' }}>your handle @{active.voice_handle || '???'}</Link>,
            classifies each by structural template, ranks Top-3 vs Bottom-3 by engagement, and
            recommends concrete angles to double down on. Re-runs every Sunday.
          </p>
          {!active.voice_handle && (
            <div style={{ padding: '14px 18px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, marginBottom: 18, fontSize: 14, color: '#c0392b' }}>
              No X handle set on this workspace. <Link href={`/workspace/${active.id}`} style={{ color: '#c0392b' }}>Add one →</Link>
            </div>
          )}
          <PostRoiRunner workspace={active} initialDigest={digest} />
        </div>
      </section>
    </div>
  )
}

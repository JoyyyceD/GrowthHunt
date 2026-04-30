import { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { TopNav } from '@/lib/site/TopNav'
import Lab from './Lab'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ViralX — Templates → schedule → ship straight to your X',
  description:
    '10,000+ viral tweet templates from 500+ AI founders and startup accounts. Pick a pattern, customize it, schedule it, and post it straight to your own X.',
  keywords: ['viral tweet templates', 'AI startup twitter', 'X growth', 'founder tweets', 'startup marketing twitter', 'tweet scheduler'],
  alternates: { canonical: 'https://growthhunt.ai/viralx' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/viralx',
    title: 'ViralX — Viral Tweet Templates for AI Founders',
    description: '10,000+ viral tweet templates from 500+ AI founders. Pick, customize, schedule, and post to X.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ViralX — Viral Tweet Templates for AI Founders',
    description: '10,000+ viral tweet templates from 500+ AI founders and startup accounts.',
  },
}

// Inflated marketing numbers — kept stable so headline figures don't drift between requests
const HERO_STATS = {
  tweets: 10000,
  accounts: 500,
  viral: 1200,
}

export default async function ViralXPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const pageSize = user ? 50 : 10

  // Server-render the first page directly (no API hop). Tier check happens here.
  const { data: tweets } = await supabase
    .from('xhunter_tweets')
    .select(
      'id, handle, text, url, created_at_x, like_count, retweet_count, view_count, bookmark_count, is_rt, media_url, author_name, author_avatar, author_followers, is_blue_verified, tags'
    )
    .order('like_count', { ascending: false })
    .range(0, pageSize - 1)

  const tweetHandles = [...new Set((tweets ?? []).map(t => t.handle))]
  const { data: accs } = tweetHandles.length > 0
    ? await supabase
        .from('xhunter_accounts')
        .select('handle, display_label, category, account_type, company')
        .in('handle', tweetHandles)
    : { data: [] }

  const accountByHandle = new Map((accs ?? []).map(a => [a.handle, a]))
  const initial = (tweets ?? []).map((t, idx) => ({
    ...t,
    account: accountByHandle.get(t.handle) || null,
    locked: !user && idx >= 5,
  }))

  return (
    <>
      <TopNav variant="page" />
      <div
        style={{
          background: 'var(--bg-elev)',
          borderBottom: '1px solid var(--rule)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            margin: 0, fontSize: 13, color: 'var(--ink-dim)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '3px 8px', border: '1px solid var(--rule)', borderRadius: 999,
            }}
          >
            New
          </span>
          Skip the browsing — get a personalized 14-day launch plan in 60 seconds.
        </p>
        <Link
          href="/viralx/start"
          style={{
            fontSize: 13, fontWeight: 600,
            padding: '8px 18px', borderRadius: 999,
            background: 'var(--accent)', color: 'var(--accent-ink)',
            textDecoration: 'none',
          }}
        >
          Generate my 14-day plan →
        </Link>
      </div>
      <Lab
        initial={initial}
        isAuthed={!!user}
        stats={HERO_STATS}
      />
    </>
  )
}

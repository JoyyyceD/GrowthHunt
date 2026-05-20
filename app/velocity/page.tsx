import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { TopNav } from '@/lib/site/TopNav'
import { Velocity } from './Velocity'
import type {
  RepoRow,
  BuilderRow,
  ViralRow,
  RepoCard,
  BuilderCard,
  ViralCard,
  BuilderRankMode,
} from '@/lib/velocity/types'

// ISR — the data only changes weekly, so serve a cached page and rebuild it
// at most every 30 minutes. No per-user data, so no cookies / no auth client.
export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Velocity — The fastest-moving things in AI, updated weekly',
  description:
    'A live leaderboard of the fastest-growing GitHub repos, the fastest-growing AI founders on X, and the most viral AI products. Updated every week.',
  keywords: [
    'fastest growing github repos',
    'trending ai repos',
    'ai founders to follow',
    'viral ai products',
    'ai startup leaderboard',
    'github trending ai',
    'fastest growing ai startups',
  ],
  alternates: { canonical: 'https://growthhunt.ai/velocity' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/velocity',
    title: 'Velocity — The fastest-moving things in AI',
    description:
      'Fastest-growing GitHub repos, fastest-growing AI founders, and the most viral AI products. Updated weekly.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Velocity — The fastest-moving things in AI',
    description:
      'Fastest-growing GitHub repos, AI founders, and viral products. Updated weekly.',
  },
}

const DAY = 86_400_000

export default async function VelocityPage() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [reposRes, buildersRes, viralRes] = await Promise.all([
    sb.from('velocity_github_repos').select('*').order('stars', { ascending: false }).limit(150),
    sb.from('velocity_builders_v').select('*').limit(300),
    sb
      .from('velocity_viral_products_v')
      .select('*')
      .order('total_engagement', { ascending: false })
      .limit(60),
  ])

  const repoRows = (reposRes.data ?? []) as RepoRow[]
  const builderRows = (buildersRes.data ?? []) as BuilderRow[]
  const viralRows = (viralRes.data ?? []) as ViralRow[]

  const now = Date.now()

  // ── Repos: ranked by stars gained per day since creation. Every tracked
  //    repo is ≤90 days old, so this is a fair single-snapshot velocity. ──
  const repoCards: RepoCard[] = repoRows
    .map(r => {
      const ageDays = Math.max((now - new Date(r.repo_created_at).getTime()) / DAY, 1)
      return { r, ageDays, velocityPerDay: r.stars / ageDays }
    })
    .sort((a, b) => b.velocityPerDay - a.velocityPerDay)
    .slice(0, 60)
    .map(({ r, ageDays, velocityPerDay }, i) => ({
      rank: i + 1,
      fullName: r.full_name,
      name: r.name,
      owner: r.owner,
      ownerAvatar: r.owner_avatar,
      description: r.description,
      language: r.language,
      topics: (r.topics ?? []).slice(0, 3),
      url: r.html_url,
      stars: r.stars,
      velocityPerDay: Math.round(velocityPerDay),
      weeklyDelta: r.stars_prev != null ? r.stars - r.stars_prev : null,
      ageDays: Math.round(ageDays),
      isNew: ageDays <= 14,
      isAI: r.is_ai,
    }))

  // ── Builders: once two weekly snapshots exist, rank by real follower
  //    growth. Until then, rank by 30-day engagement momentum. ──
  const builderRankMode: BuilderRankMode = builderRows.some(
    b => b.followers_prev != null && b.followers - (b.followers_prev ?? 0) > 0,
  )
    ? 'followers'
    : 'momentum'

  const builderCards: BuilderCard[] = builderRows
    .map(b => ({
      b,
      followerDelta: b.followers_prev != null ? b.followers - b.followers_prev : null,
    }))
    .filter(({ b, followerDelta }) =>
      builderRankMode === 'followers' ? (followerDelta ?? 0) > 0 : b.momentum_30d > 0,
    )
    .sort((a, b) =>
      builderRankMode === 'followers'
        ? (b.followerDelta ?? 0) - (a.followerDelta ?? 0)
        : b.b.momentum_30d - a.b.momentum_30d,
    )
    .slice(0, 50)
    .map(({ b, followerDelta }, i) => ({
      rank: i + 1,
      handle: b.handle,
      name: b.display_name || b.handle,
      avatar: b.avatar,
      displayLabel: b.display_label,
      company: b.company,
      category: b.category,
      verified: b.is_blue_verified,
      followers: b.followers,
      followerDelta,
      momentum: b.momentum_30d,
      tweets30d: b.tweets_30d,
      topTweetText: b.top_tweet_text,
      topTweetUrl: b.top_tweet_url,
    }))

  const viralCards: ViralCard[] = viralRows.slice(0, 40).map((v, i) => ({
    rank: i + 1,
    company: v.company,
    category: v.category,
    viralCount: v.viral_tweet_count,
    launchCount: v.launch_tweet_count,
    engagement: v.total_engagement,
    views: v.total_views,
    topTweetText: v.top_tweet_text,
    topTweetUrl: v.top_tweet_url,
    topHandle: v.top_handle,
    topAuthorName: v.top_author_name,
    topAuthorAvatar: v.top_author_avatar,
  }))

  const syncTimes = [
    ...repoRows.map(r => r.synced_at),
    ...builderRows.map(b => b.synced_at),
  ]
    .filter((s): s is string => Boolean(s))
    .map(s => new Date(s).getTime())
    .filter(t => !Number.isNaN(t))
  const updatedAt = syncTimes.length ? new Date(Math.max(...syncTimes)).toISOString() : null

  return (
    <>
      <TopNav variant="page" />
      <Velocity
        repos={repoCards}
        builders={builderCards}
        viral={viralCards}
        builderRankMode={builderRankMode}
        updatedAt={updatedAt}
      />
      <Footer />
    </>
  )
}

function Footer() {
  return (
    <footer className="bottom">
      <div className="shell" style={{ display: 'contents' }}>
        <div>
          <div className="big serif">GrowthHunt.</div>
          <div style={{ color: 'var(--ink-dim)', fontSize: 14, maxWidth: 280, lineHeight: 1.55 }}>
            One agent for the entire go-to-market motion. Built for indie founders, growth teams,
            and out-bound-going-global startups.
          </div>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><Link href="/#live">Live tools</Link></li>
            <li><Link href="/coming-soon">Coming soon</Link></li>
            <li><Link href="/blog">Blog</Link></li>
          </ul>
        </div>
        <div>
          <h4>Live products</h4>
          <ul>
            <li><Link href="/velocity">Velocity</Link></li>
            <li><Link href="/xgrower">X Grower</Link></li>
            <li><Link href="/viralx">ViralX</Link></li>
            <li><Link href="/picolaunch">PicoLaunch</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="mailto:hi@growthhunt.ai">hi@growthhunt.ai</a></li>
          </ul>
        </div>
        <div className="copyright">
          <span>© 2026 GrowthHunt Labs</span>
          <span>Built with care · No tracking · No bullshit</span>
        </div>
      </div>
    </footer>
  )
}

// Shared types for the Velocity tracker (/velocity).

/** A repo as fetched from the GitHub Search API and normalized. */
export interface RepoFetch {
  id: string
  full_name: string
  name: string
  owner: string
  owner_avatar: string | null
  owner_url: string | null
  description: string | null
  language: string | null
  topics: string[]
  html_url: string
  homepage: string | null
  stars: number
  forks: number
  open_issues: number
  repo_created_at: string
  repo_pushed_at: string | null
  is_ai: boolean
}

/** A row of velocity_github_repos. */
export interface RepoRow extends RepoFetch {
  stars_prev: number | null
  synced_at: string
}

/** A row of velocity_builders_v. */
export interface BuilderRow {
  handle: string
  display_name: string | null
  avatar: string | null
  company: string | null
  category: string | null
  account_type: string | null
  display_label: string | null
  is_blue_verified: boolean
  followers: number
  followers_prev: number | null
  synced_at: string | null
  momentum_30d: number
  tweets_30d: number
  top_tweet_id: string | null
  top_tweet_text: string | null
  top_tweet_url: string | null
  top_tweet_likes: number | null
}

/** A row of velocity_viral_products_v. */
export interface ViralRow {
  company: string
  category: string | null
  launch_tweet_count: number
  viral_tweet_count: number
  total_engagement: number
  total_views: number
  top_like_count: number
  top_tweet_id: string | null
  top_tweet_text: string | null
  top_tweet_url: string | null
  top_handle: string | null
  top_author_name: string | null
  top_author_avatar: string | null
  top_tweet_at: string | null
}

// ── Display cards — computed server-side, passed to the client component ──

export interface RepoCard {
  rank: number
  fullName: string
  name: string
  owner: string
  ownerAvatar: string | null
  description: string | null
  language: string | null
  topics: string[]
  url: string
  stars: number
  velocityPerDay: number
  weeklyDelta: number | null
  ageDays: number
  isNew: boolean
  isAI: boolean
}

export interface BuilderCard {
  rank: number
  handle: string
  name: string
  avatar: string | null
  displayLabel: string | null
  company: string | null
  category: string | null
  verified: boolean
  followers: number
  followerDelta: number | null
  momentum: number
  tweets30d: number
  topTweetText: string | null
  topTweetUrl: string | null
}

export interface ViralCard {
  rank: number
  company: string
  category: string | null
  viralCount: number
  launchCount: number
  engagement: number
  views: number
  topTweetText: string | null
  topTweetUrl: string | null
  topHandle: string | null
  topAuthorName: string | null
  topAuthorAvatar: string | null
}

export type BuilderRankMode = 'followers' | 'momentum'

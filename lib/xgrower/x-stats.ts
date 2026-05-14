/**
 * Fetch live X account stats for the X Grower landing page hero.
 * Backed by twitterapi.io (same provider as ViralX ingest cron).
 *
 * Cached at the Next.js fetch layer for 30 minutes — landing page traffic
 * shouldn't blow our twitterapi.io budget, and a stale-by-30-min hero number
 * is fine for storytelling.
 */

const TWITTERAPI_IO_KEY = process.env.TWITTERAPI_IO_KEY
const HANDLE = 'Felixisbuilding'
// Account creation reference for the "days" stat. Felix started growing
// on 2026-05-06 (per his X profile snapshot showing 0 → 76 in 4 days).
const GROWTH_START_ISO = '2026-05-06T00:00:00Z'

export interface XGrowerStats {
  followers: number
  posts: number
  daysSinceStart: number
  costPerReply: number
  costPerPost: number
  source: 'live' | 'fallback'
}

const FALLBACK: XGrowerStats = {
  followers: 76,
  posts: 338,
  daysSinceStart: 4,
  costPerReply: 0.05,
  costPerPost: 0.015,
  source: 'fallback',
}

export async function fetchXGrowerStats(): Promise<XGrowerStats> {
  if (!TWITTERAPI_IO_KEY) return FALLBACK

  try {
    const res = await fetch(
      `https://api.twitterapi.io/twitter/user/info?userName=${HANDLE}`,
      {
        headers: { 'X-API-Key': TWITTERAPI_IO_KEY },
        next: { revalidate: 60 * 30 }, // 30 min cache
      },
    )
    if (!res.ok) return FALLBACK
    // twitterapi.io's response shape varies by endpoint — be permissive about
    // both `followers` / `followers_count` and `statusesCount` / `statuses_count`.
    const json = (await res.json()) as {
      data?: {
        followers?: number
        followers_count?: number
        statusesCount?: number
        statuses_count?: number
      }
    }
    const d = json?.data
    const followers =
      typeof d?.followers === 'number'
        ? d.followers
        : typeof d?.followers_count === 'number'
        ? d.followers_count
        : null
    const posts =
      typeof d?.statusesCount === 'number'
        ? d.statusesCount
        : typeof d?.statuses_count === 'number'
        ? d.statuses_count
        : null
    if (followers === null || followers < 0) return FALLBACK

    const daysSinceStart = Math.max(
      1,
      Math.round(
        (Date.now() - new Date(GROWTH_START_ISO).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    )

    return {
      followers,
      posts: posts !== null && posts >= 0 ? posts : FALLBACK.posts,
      daysSinceStart,
      costPerReply: 0.05,
      costPerPost: 0.015,
      source: 'live',
    }
  } catch {
    return FALLBACK
  }
}

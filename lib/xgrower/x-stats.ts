/**
 * Fetch live X account stats for the X Grower landing page hero.
 * Backed by twitterapi.io (same provider as ViralX ingest cron).
 *
 * Cached at the Next.js fetch layer for 30 minutes — landing page traffic
 * shouldn't blow our twitterapi.io budget, and a stale-by-30-min hero number
 * is fine for storytelling.
 *
 * NOTE: Pricing model is now LemonSqueezy subscription with a dual-price tier:
 * Founding cohort (first 500 paid users) lock $9/mo for life; from the 501st
 * paid user onwards, Pro is $19/mo standard. The Free tier (10 replies/day,
 * 100/month max) is permanent and unchanged. Separately, the first 100 X
 * users to reply "I'm in" to Felix's pinned tweet get an invite code that
 * unlocks 30 days of Pro free (unrelated to the price lock).
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
  /** Founding-cohort Pro price — first 500 paid users, lifetime locked. */
  proPriceFoundingMonthly: string
  /** Standard Pro price — applies from the 501st paid user onwards. */
  proPriceStandardMonthly: string
  /** Free tier daily cap — informational only, kept in lib so copy can reference it. */
  freeRepliesPerDay: number
  /** Free tier monthly cap. */
  freeRepliesPerMonth: number
  source: 'live' | 'fallback'
}

const FALLBACK: XGrowerStats = {
  followers: 76,
  posts: 338,
  daysSinceStart: 4,
  proPriceFoundingMonthly: '$9', // first 500 paid users, lifetime locked
  proPriceStandardMonthly: '$19', // 501st paid user onwards
  freeRepliesPerDay: 10,
  freeRepliesPerMonth: 100,
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
      // Subscription model (LemonSqueezy) replaces pay-per-reply.
      // Dual-price: first 500 paid users lock $9/mo for life; 501+ pay $19/mo.
      // Keep these informational fields so the landing page can render the
      // free-tier quota and dual-price copy without hardcoding numbers in JSX.
      proPriceFoundingMonthly: '$9', // first 500 paid users, lifetime locked
      proPriceStandardMonthly: '$19', // 501st paid user onwards
      freeRepliesPerDay: 10,
      freeRepliesPerMonth: 100,
      source: 'live',
    }
  } catch {
    return FALLBACK
  }
}

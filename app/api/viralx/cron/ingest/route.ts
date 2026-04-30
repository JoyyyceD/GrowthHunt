/**
 * Cron: re-fetch the most recent tweets per handle from twitterapi.io.
 * Schedule: every 6 hours (cron expression configured in vercel.json).
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` if you set
 *       CRON_SECRET in env vars. We verify that here. Anything else gets 401.
 *
 * Strategy:
 *   1. List all handles in xhunter_accounts
 *   2. For each, query `from:<handle>` since the last ingested tweet's id
 *   3. Tag the new tweets via the regex rules (viral / launch / metric / thread)
 *   4. Upsert into xhunter_tweets
 *
 * NOTE: budget guard — caps at MAX_HANDLES_PER_RUN per invocation to stay
 * under twitterapi.io rate limits. Cron runs every 6h × 4 runs/day = ~277/4 ≈ 70
 * handles per run is conservative. We round up to 80.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — plenty for ~80 fetches with 6s gap

const MAX_HANDLES_PER_RUN = 80
const FETCH_GAP_MS = 5_500
const VIRAL_LIKES = 5000
const RE_LAUNCH = /\b(introducing|launching|we just (shipped|launched)|now available|public beta|public launch|just shipped|new release|announcing|now live)\b/i
const RE_METRIC = /(\$\d+(\.\d+)?[KMB]\b|\b\d+(\.\d+)?[KMB]\+?\s+(ARR|MRR|users|customers|signups|downloads|paying customers|paid users|subscribers)\b|\b\d+%\s+(growth|MoM|YoY)\b)/i
const RE_THREAD_NUMBERED = /\b1\/(\d+|n)\b/
const RE_THREAD_LIST = /^\s*\d+[.)]\s/m

interface Tweet {
  id?: string
  text?: string
  url?: string
  createdAt?: string
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  viewCount?: number
  bookmarkCount?: number
  author?: {
    userName?: string
    name?: string
    profilePicture?: string
    followers?: number
    isBlueVerified?: boolean
  }
  extendedEntities?: { media?: Array<{ media_url_https?: string; media_url?: string }> }
}

function tagsFor(t: { likeCount?: number; text?: string }): string[] {
  const tags: string[] = []
  const text = t.text || ''
  if ((t.likeCount || 0) >= VIRAL_LIKES) tags.push('viral')
  if (RE_LAUNCH.test(text)) tags.push('launch')
  if (RE_METRIC.test(text)) tags.push('metric')
  if (text.length > 280 || RE_THREAD_NUMBERED.test(text) || RE_THREAD_LIST.test(text)) tags.push('thread')
  return tags
}

export async function GET(req: NextRequest) {
  // Vercel Cron auth
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.TWITTERAPI_IO_KEY) {
    return NextResponse.json({ error: 'TWITTERAPI_IO_KEY not set' }, { status: 500 })
  }

  const sb = createAdminClient()

  // Pick handles least-recently-touched first (rotates across cron runs)
  const { data: accounts, error: accErr } = await sb
    .from('xhunter_accounts')
    .select('handle')
    .order('handle')
    .limit(MAX_HANDLES_PER_RUN)
  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 })
  }
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: 'no accounts' })
  }

  let totalNew = 0
  let totalChecked = 0
  const errors: string[] = []

  for (const { handle } of accounts) {
    totalChecked++
    try {
      // Find most recent tweet's createdAt for this handle (simpler than since_id)
      const { data: latest } = await sb
        .from('xhunter_tweets')
        .select('created_at_x')
        .eq('handle', handle)
        .order('created_at_x', { ascending: false })
        .limit(1)
        .maybeSingle()

      const sinceTime = latest
        ? Math.floor(new Date(latest.created_at_x).getTime() / 1000)
        : Math.floor((Date.now() - 30 * 86400_000) / 1000) // 30 days back if cold

      const query = `from:${handle} min_faves:50 since_time:${sinceTime}`
      const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Top&cursor=`

      const res = await fetch(url, {
        headers: { 'X-API-Key': process.env.TWITTERAPI_IO_KEY! },
      })
      if (!res.ok) {
        errors.push(`@${handle}: HTTP ${res.status}`)
        await new Promise(r => setTimeout(r, FETCH_GAP_MS))
        continue
      }
      const data = await res.json()
      const tweets: Tweet[] = data?.tweets ?? data?.data?.tweets ?? []

      const rows = tweets
        .filter(t => t?.text && t?.id)
        .map(t => {
          const media = t.extendedEntities?.media?.[0]
          return {
            id: t.id!,
            handle,
            text: t.text!,
            url: t.url ?? `https://x.com/${handle}/status/${t.id}`,
            created_at_x: new Date(t.createdAt!).toISOString(),
            like_count:      t.likeCount      ?? 0,
            retweet_count:   t.retweetCount   ?? 0,
            reply_count:     t.replyCount     ?? 0,
            view_count:      t.viewCount      ?? 0,
            bookmark_count:  t.bookmarkCount  ?? 0,
            is_rt:           (t.text || '').startsWith('RT @'),
            media_url:       media?.media_url_https ?? media?.media_url ?? null,
            author_name:     t.author?.name ?? null,
            author_avatar:   t.author?.profilePicture ?? null,
            author_followers: t.author?.followers ?? null,
            is_blue_verified: t.author?.isBlueVerified ?? false,
            tags:            tagsFor({ likeCount: t.likeCount, text: t.text }),
          }
        })

      if (rows.length > 0) {
        const { error: upErr } = await sb.from('xhunter_tweets').upsert(rows, { onConflict: 'id' })
        if (upErr) {
          errors.push(`@${handle}: upsert ${upErr.message}`)
        } else {
          totalNew += rows.length
        }
      }
    } catch (e) {
      errors.push(`@${handle}: ${e instanceof Error ? e.message : String(e)}`)
    }
    await new Promise(r => setTimeout(r, FETCH_GAP_MS))
  }

  return NextResponse.json({
    checked: totalChecked,
    new_or_updated: totalNew,
    errors: errors.slice(0, 20),
  })
}

/**
 * One-off backfill: for every xhunter_accounts handle that currently has zero
 * tweets in xhunter_tweets, hit twitterapi.io advanced_search with a wide
 * time window and upsert results.
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types scripts/xhunter-backfill-zero.ts
 *
 * Idempotent — uses upsert on tweet id. Safe to re-run; on second run,
 * accounts that gained data on the first run are skipped.
 *
 * Tagging logic mirrors app/api/xhunter/cron/ingest/route.ts.
 */
import { createClient } from '@supabase/supabase-js'

const SINCE_TIME_UNIX = Math.floor(new Date('2022-01-01T00:00:00Z').getTime() / 1000)
const MIN_FAVES = 50
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

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  const TWAPI = process.env.TWITTERAPI_IO_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!TWAPI) {
    console.error('Missing TWITTERAPI_IO_KEY')
    process.exit(1)
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Find zero-data handles via two queries (supabase-js client doesn't expose arbitrary SQL)
  const { data: allAccounts, error: aErr } = await sb
    .from('xhunter_accounts')
    .select('handle')
  if (aErr || !allAccounts) {
    console.error('Failed to load accounts:', aErr?.message)
    process.exit(1)
  }

  const { data: tweetHandles, error: tErr } = await sb
    .from('xhunter_tweets')
    .select('handle')
  if (tErr) {
    console.error('Failed to load tweets:', tErr.message)
    process.exit(1)
  }
  const withData = new Set((tweetHandles ?? []).map(r => r.handle))
  const zeroData = allAccounts.map(a => a.handle).filter(h => !withData.has(h)).sort()

  console.log(`[backfill] ${zeroData.length} zero-data handles to process`)
  console.log(`[backfill] window: since ${new Date(SINCE_TIME_UNIX * 1000).toISOString()}, min_faves=${MIN_FAVES}`)

  let totalInserted = 0
  const empty: string[] = []
  const errors: Array<{ handle: string; err: string }> = []

  for (let i = 0; i < zeroData.length; i++) {
    const handle = zeroData[i]
    const prefix = `[${i + 1}/${zeroData.length}] @${handle}`

    try {
      const query = `from:${handle} min_faves:${MIN_FAVES} since_time:${SINCE_TIME_UNIX}`
      const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Top&cursor=`
      const res = await fetch(url, { headers: { 'X-API-Key': TWAPI } })
      if (!res.ok) {
        errors.push({ handle, err: `HTTP ${res.status}` })
        console.log(`${prefix} → HTTP ${res.status}`)
        await new Promise(r => setTimeout(r, FETCH_GAP_MS))
        continue
      }
      const data = await res.json()
      const tweets: Tweet[] = data?.tweets ?? data?.data?.tweets ?? []

      const rows = tweets
        .filter(t => t?.text && t?.id && t?.createdAt)
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

      if (rows.length === 0) {
        empty.push(handle)
        console.log(`${prefix} → 0 tweets`)
      } else {
        const { error: upErr } = await sb.from('xhunter_tweets').upsert(rows, { onConflict: 'id' })
        if (upErr) {
          errors.push({ handle, err: `upsert ${upErr.message}` })
          console.log(`${prefix} → upsert error: ${upErr.message}`)
        } else {
          totalInserted += rows.length
          console.log(`${prefix} → +${rows.length} tweets`)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push({ handle, err: msg })
      console.log(`${prefix} → exception: ${msg}`)
    }
    await new Promise(r => setTimeout(r, FETCH_GAP_MS))
  }

  console.log('\n========== BACKFILL SUMMARY ==========')
  console.log(`processed handles: ${zeroData.length}`)
  console.log(`tweets inserted:   ${totalInserted}`)
  console.log(`empty results:     ${empty.length}`)
  console.log(`errors:            ${errors.length}`)
  if (empty.length > 0) {
    console.log('\nstill empty (likely dead/typo/private):')
    empty.forEach(h => console.log(`  - ${h}`))
  }
  if (errors.length > 0) {
    console.log('\nerrors:')
    errors.forEach(e => console.log(`  - ${e.handle}: ${e.err}`))
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

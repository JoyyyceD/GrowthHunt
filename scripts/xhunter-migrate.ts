/**
 * One-off migration: copy ai-tweet-inspirations JSON files into Supabase.
 *
 * Usage:
 *   1. Run the SQL migration first via Supabase Dashboard SQL Editor:
 *      supabase/migrations/20260430_xhunter_schema.sql
 *   2. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   3. Run:
 *      node --env-file=.env.local --experimental-strip-types scripts/xhunter-migrate.ts <source>
 *
 * Idempotent — uses upsert on primary keys. Safe to re-run.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

interface AccountMeta {
  type: 'official' | 'founder'
  company: string
  category: string
  displayLabel: string
  stage?: string
  notes?: string
}

interface RawTweet {
  id: string
  text: string
  url: string
  createdAt: string
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
  extendedEntities?: {
    media?: Array<{ media_url_https?: string; media_url?: string }>
  }
}

async function main() {
  const sourceDir = process.argv[2]
  if (!sourceDir || !existsSync(sourceDir)) {
    console.error(
      'Usage: node --env-file=.env.local --experimental-strip-types scripts/xhunter-migrate.ts <path-to-ai-tweet-inspirations>\n' +
      'Source must contain account_meta.json, tweet_tags.json, tweet_llm_tags.json, data/*.json'
    )
    process.exit(1)
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Step 1: load source files ────────────────────────────────────────────
  const accountMeta: Record<string, AccountMeta> = JSON.parse(
    readFileSync(join(sourceDir, 'account_meta.json'), 'utf8')
  )
  const regexTags: Record<string, string[]> = JSON.parse(
    readFileSync(join(sourceDir, 'tweet_tags.json'), 'utf8')
  )
  const llmTags: Record<string, string[]> = JSON.parse(
    readFileSync(join(sourceDir, 'tweet_llm_tags.json'), 'utf8')
  )

  const dataDir = join(sourceDir, 'data')
  const files = readdirSync(dataDir).filter(f => f.endsWith('.json'))

  const tweets: RawTweet[] = []
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(dataDir, f), 'utf8'))
    const arr = raw?.data?.tweets ?? raw?.tweets ?? []
    for (const t of arr) {
      if (!t?.text || !t?.id) continue
      tweets.push(t)
    }
  }

  const seen = new Set<string>()
  const dedup = tweets.filter(t => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })

  console.log(`[migrate] source: ${dedup.length} unique tweets, ${Object.keys(accountMeta).length} accounts`)

  // ── Step 2: upsert accounts ──────────────────────────────────────────────
  const accountRows = Object.entries(accountMeta).map(([handle, m]) => ({
    handle: handle.toLowerCase(),
    account_type: m.type,
    company: m.company,
    category: m.category,
    display_label: m.displayLabel,
    stage: m.stage ?? null,
    notes: m.notes ?? null,
  }))

  const ACCOUNT_BATCH = 200
  let accountsInserted = 0
  for (let i = 0; i < accountRows.length; i += ACCOUNT_BATCH) {
    const batch = accountRows.slice(i, i + ACCOUNT_BATCH)
    const { error } = await sb.from('xhunter_accounts').upsert(batch, { onConflict: 'handle' })
    if (error) {
      console.error('[migrate] account upsert failed:', error)
      process.exit(1)
    }
    accountsInserted += batch.length
    process.stdout.write(`\r[migrate] accounts: ${accountsInserted}/${accountRows.length}`)
  }
  process.stdout.write('\n')

  // ── Step 3: upsert tweets (only those with a matching account) ───────────
  const knownHandles = new Set(accountRows.map(a => a.handle))
  let skippedNoHandle = 0

  const tweetRows = dedup
    .map(t => {
      const handle = t.author?.userName?.toLowerCase()
      if (!handle || !knownHandles.has(handle)) {
        skippedNoHandle++
        return null
      }
      const media = t.extendedEntities?.media?.[0]
      const mediaUrl = media?.media_url_https ?? media?.media_url ?? null
      const tags = Array.from(new Set([...(regexTags[t.id] ?? []), ...(llmTags[t.id] ?? [])]))
      return {
        id: t.id,
        handle,
        text: t.text,
        url: t.url,
        created_at_x: new Date(t.createdAt).toISOString(),
        like_count:      t.likeCount      ?? 0,
        retweet_count:   t.retweetCount   ?? 0,
        reply_count:     t.replyCount     ?? 0,
        view_count:      t.viewCount      ?? 0,
        bookmark_count:  t.bookmarkCount  ?? 0,
        is_rt:           (t.text || '').startsWith('RT @'),
        media_url:       mediaUrl,
        author_name:     t.author?.name ?? null,
        author_avatar:   t.author?.profilePicture ?? null,
        author_followers: t.author?.followers ?? null,
        is_blue_verified: t.author?.isBlueVerified ?? false,
        tags,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const TWEET_BATCH = 500
  let tweetsInserted = 0
  for (let i = 0; i < tweetRows.length; i += TWEET_BATCH) {
    const batch = tweetRows.slice(i, i + TWEET_BATCH)
    const { error } = await sb.from('xhunter_tweets').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error('[migrate] tweet upsert failed:', error)
      process.exit(1)
    }
    tweetsInserted += batch.length
    process.stdout.write(`\r[migrate] tweets: ${tweetsInserted}/${tweetRows.length}`)
  }
  process.stdout.write('\n')

  console.log(`[migrate] DONE — ${accountsInserted} accounts, ${tweetsInserted} tweets`)
  if (skippedNoHandle > 0) {
    console.log(`[migrate] skipped ${skippedNoHandle} tweets (handle not in account_meta — pre-existing seed mismatches)`)
  }
}

main().catch(err => {
  console.error('[migrate] fatal:', err)
  process.exit(1)
})

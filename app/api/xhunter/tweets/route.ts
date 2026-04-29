/**
 * GET /api/xhunter/tweets?page=1&category=ai-coding&type=founder&tag=viral&sort=likes
 *
 * Anti-scraping:
 *   - Anonymous: pageSize = 10
 *   - Logged-in (any tier): pageSize = 50
 *   - IP rate limit: 60 req/min
 *
 * Response: { tweets: TweetCard[], page, hasMore, pageSize }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit, RATE } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/ip-hash'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = new Set([
  'ai-coding', 'ai-agent', 'infra', 'consumer', 'image', 'video', 'audio',
  'productivity', 'vertical', 'indie', 'founder', 'hardware',
])
const VALID_TYPES = new Set(['official', 'founder'])
const VALID_TAGS = new Set([
  'viral', 'launch', 'metric', 'thread',
  'low-key-demo', 'engagement', 'meme', 'behind-the-scenes',
])
const VALID_SORTS = new Set(['likes', 'views', 'bookmarks', 'recent'])

const SORT_COLUMN: Record<string, string> = {
  likes: 'like_count',
  views: 'view_count',
  bookmarks: 'bookmark_count',
  recent: 'created_at_x',
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit(`xhunter_read:${ip}`, RATE.xhunter_read.max, RATE.xhunter_read.windowSec)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Math.min(Number(searchParams.get('page')) || 1, 200))
  const category = searchParams.get('category')
  const type = searchParams.get('type')
  const tag = searchParams.get('tag')
  const sort = searchParams.get('sort') || 'likes'

  // Validate inputs (allowlist — never let user-supplied strings into queries unfiltered)
  if (category && !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
  }
  if (type && !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }
  if (tag && !VALID_TAGS.has(tag)) {
    return NextResponse.json({ error: 'invalid_tag' }, { status: 400 })
  }
  if (!VALID_SORTS.has(sort)) {
    return NextResponse.json({ error: 'invalid_sort' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const pageSize = user ? 50 : 10

  // Step 1 — if category/type filter is set, get matching handles first
  let handles: string[] | null = null
  if (category || type) {
    let aq = supabase.from('xhunter_accounts').select('handle')
    if (category) aq = aq.eq('category', category)
    if (type) aq = aq.eq('account_type', type)
    const { data: accs, error: aErr } = await aq
    if (aErr) {
      console.error('[xhunter/tweets] accounts:', aErr)
      return NextResponse.json({ error: aErr.message }, { status: 500 })
    }
    handles = (accs ?? []).map(a => a.handle)
    if (handles.length === 0) {
      return NextResponse.json({ tweets: [], page, hasMore: false, pageSize })
    }
  }

  // Step 2 — fetch tweets
  let q = supabase
    .from('xhunter_tweets')
    .select(
      'id, handle, text, url, created_at_x, like_count, retweet_count, reply_count, view_count, bookmark_count, is_rt, media_url, author_name, author_avatar, author_followers, is_blue_verified, tags'
    )
    .order(SORT_COLUMN[sort]!, { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (handles) q = q.in('handle', handles)
  if (tag) q = q.contains('tags', [tag])

  const { data: tweets, error: tErr } = await q
  if (tErr) {
    console.error('[xhunter/tweets] tweets:', tErr)
    return NextResponse.json({ error: tErr.message }, { status: 500 })
  }

  // Step 3 — fetch account meta for returned tweets
  const tweetHandles = [...new Set((tweets ?? []).map(t => t.handle))]
  let accountByHandle = new Map<string, { handle: string; display_label: string; category: string; account_type: string; company: string }>()
  if (tweetHandles.length > 0) {
    const { data: accs } = await supabase
      .from('xhunter_accounts')
      .select('handle, display_label, category, account_type, company')
      .in('handle', tweetHandles)
    accountByHandle = new Map((accs ?? []).map(a => [a.handle, a]))
  }

  // Step 4 — assemble + (anonymous) lock cards 6+
  const result = (tweets ?? []).map((t, idx) => {
    const account = accountByHandle.get(t.handle) || null
    // For unauthenticated users, lock cards beyond index 4 (i.e. show 5 free + 5 locked teasers).
    const locked = !user && idx >= 5
    return {
      ...t,
      account,
      locked,
    }
  })

  return NextResponse.json({
    tweets: result,
    page,
    pageSize,
    hasMore: result.length === pageSize,
  }, {
    headers: user
      ? { 'Cache-Control': 'private, no-store' }
      : { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}

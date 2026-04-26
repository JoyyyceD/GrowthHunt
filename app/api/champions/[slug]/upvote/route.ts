import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientIp, ipHash } from '@/lib/ip-hash'
import { rateLimit, RATE } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

// POST /api/champions/[slug]/upvote
// Idempotent: re-clicking returns the same state (no toggle/unvote in v0).
// Auth path: user_id-based vote.  Anon path: ip_hash-based, one per IP per UTC day.
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rate-limit: per-user when authed, per-IP when anon
  const limitKey = user ? `vote:u:${user.id}` : `vote:ip:${getClientIp(req)}`
  const rl = rateLimit(limitKey, RATE.vote.max, RATE.vote.windowSec)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    )
  }

  // Find champion by slug — use anon client (RLS allows public read)
  const { data: champion, error: cErr } = await supabase
    .from('champions')
    .select('id, slug, upvote_count')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()
  if (cErr || !champion) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Service role bypasses RLS — needed because votes table has no client-write policy
  const admin = createAdminClient()

  let voteRow:
    | { user_id: string | null; ip_hash: string | null; champion_id: string }
    | null = null
  let alreadyVoted = false

  if (user) {
    // Auth path
    const insertRow = { champion_id: champion.id, user_id: user.id }
    const { data, error } = await admin
      .from('votes')
      .insert(insertRow)
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') {
        alreadyVoted = true
      } else {
        console.error('[POST upvote authed]', error)
        return NextResponse.json({ error: 'vote_failed' }, { status: 500 })
      }
    }
    voteRow = { ...insertRow, ip_hash: null }
  } else {
    // Anon path — IP hash with daily salt
    let hash: string
    try {
      hash = ipHash(getClientIp(req))
    } catch (e) {
      console.error('[ip-hash]', e)
      return NextResponse.json({ error: 'server_misconfig' }, { status: 500 })
    }
    const insertRow = { champion_id: champion.id, ip_hash: hash }
    const { error } = await admin
      .from('votes')
      .insert(insertRow)
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') {
        alreadyVoted = true
      } else {
        console.error('[POST upvote anon]', error)
        return NextResponse.json({ error: 'vote_failed' }, { status: 500 })
      }
    }
    voteRow = { ...insertRow, user_id: null }
  }

  // Trigger updates upvote_count.  Re-read for accurate response.
  const { data: refreshed } = await supabase
    .from('champions')
    .select('upvote_count')
    .eq('id', champion.id)
    .single()

  return NextResponse.json({
    voted: true,
    alreadyVoted,
    upvotes: refreshed?.upvote_count ?? champion.upvote_count + (alreadyVoted ? 0 : 1),
    anon: !user,
  })
}

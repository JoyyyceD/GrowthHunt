import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { commentToDTO } from '@/lib/opc-mappers'
import { rateLimit, RATE } from '@/lib/rate-limit'
import type { CommentRow, ProfileRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

// POST /api/champions/[slug]/comments  body: { body: string }
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const rl = rateLimit(`comment:${user.id}`, RATE.comment.max, RATE.comment.windowSec)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    )
  }

  let payload: Record<string, unknown> = {}
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const body = String(payload.body ?? '').trim()
  if (!body || body.length > 2000) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { data: champion } = await supabase
    .from('champions')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()
  if (!champion) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Insert comment — RLS allows authenticated insert with author_id = auth.uid()
  const { data, error } = await supabase
    .from('comments')
    .insert({ champion_id: champion.id, author_id: user.id, body })
    .select('*, author:profiles!author_id(*)')
    .single()
  if (error || !data) {
    console.error('[POST comments]', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  return NextResponse.json({ comment: commentToDTO(data as CommentRow & { author: ProfileRow | null }) }, { status: 201 })
}

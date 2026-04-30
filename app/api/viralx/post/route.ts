import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { postTweet } from '@/lib/viralx/x-publish'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { day_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const dayId = String(body.day_id || '')
  if (!dayId) return NextResponse.json({ error: 'day_id required' }, { status: 400 })

  // RLS via the join — only the owner can read this row
  const { data: day } = await sb
    .from('viralx_calendar_days')
    .select('id, content_text, posted_at, session_id')
    .eq('id', dayId)
    .maybeSingle()
  if (!day) return NextResponse.json({ error: 'day not found' }, { status: 404 })
  if (day.posted_at) return NextResponse.json({ error: 'already posted' }, { status: 409 })
  if (!day.content_text || !day.content_text.trim()) {
    return NextResponse.json({ error: 'no draft text — customize first' }, { status: 400 })
  }

  const { data: creds } = await sb
    .from('viralx_x_credentials')
    .select('consumer_key, consumer_secret, access_token, access_token_secret')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!creds || !creds.consumer_key) {
    return NextResponse.json(
      { error: 'No X credentials saved. Add them at /viralx/credentials.' },
      { status: 400 }
    )
  }

  let posted: { id: string; text: string }
  try {
    posted = await postTweet(day.content_text, {
      consumer_key: creds.consumer_key!,
      consumer_secret: creds.consumer_secret!,
      access_token: creds.access_token!,
      access_token_secret: creds.access_token_secret!,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'X post failed' },
      { status: 502 }
    )
  }

  const { error: updErr } = await sb
    .from('viralx_calendar_days')
    .update({ posted_at: new Date().toISOString(), x_post_id: posted.id })
    .eq('id', dayId)
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    x_post_id: posted.id,
    x_url: `https://x.com/i/web/status/${posted.id}`,
  })
}

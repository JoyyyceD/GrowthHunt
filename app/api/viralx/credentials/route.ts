import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyCredentials } from '@/lib/viralx/x-publish'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    consumer_key?: string; consumer_secret?: string
    access_token?: string; access_token_secret?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const ck = String(body.consumer_key || '').trim()
  const cs = String(body.consumer_secret || '').trim()
  const at = String(body.access_token || '').trim()
  const ats = String(body.access_token_secret || '').trim()
  if (!ck || !cs || !at || !ats) {
    return NextResponse.json({ error: 'all 4 keys required' }, { status: 400 })
  }

  // Verify against X by calling /2/users/me. Captures the screen_name too.
  let verified: { id: string; username: string; name: string }
  try {
    verified = await verifyCredentials({
      consumer_key: ck, consumer_secret: cs,
      access_token: at, access_token_secret: ats,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'X verification failed' },
      { status: 400 }
    )
  }

  const { error: upErr } = await sb
    .from('viralx_x_credentials')
    .upsert({
      user_id: user.id,
      source: 'byo',
      consumer_key: ck,
      consumer_secret: cs,
      access_token: at,
      access_token_secret: ats,
      x_screen_name: verified.username,
    })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, x_screen_name: verified.username })
}

export async function DELETE() {
  const sb = await createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { error } = await sb.from('viralx_x_credentials').delete().eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

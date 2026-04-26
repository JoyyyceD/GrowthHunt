import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { profileToMe } from '@/lib/opc-mappers'
import type { ProfileRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

// GET /api/me — returns current user's profile, or 401 if not signed in
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // Profile row may not exist yet (signup trigger runs on auth.users insert
    // but might race with this fetch).  Construct a minimal one from auth.
    return NextResponse.json({
      me: profileToMe({
        id: user.id,
        email: user.email ?? null,
        display_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        bio: null,
        twitter: null,
        site: null,
        created_at: new Date().toISOString(),
      } as ProfileRow),
    })
  }

  return NextResponse.json({ me: profileToMe(profile as ProfileRow) })
}

// PATCH /api/me — update display_name / bio / twitter / site
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const v = body.name.trim()
    if (!v || v.length > 80) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
    update.display_name = v
  }
  if ('bio' in body) {
    const v = body.bio == null ? null : String(body.bio).trim()
    if (v && v.length > 280) return NextResponse.json({ error: 'invalid_bio' }, { status: 400 })
    update.bio = v
  }
  if ('twitter' in body) {
    const v = body.twitter == null ? null : String(body.twitter).trim()
    if (v && v.length > 50) return NextResponse.json({ error: 'invalid_twitter' }, { status: 400 })
    update.twitter = v
  }
  if ('site' in body) {
    const v = body.site == null ? null : String(body.site).trim()
    if (v && (!/^https?:\/\//i.test(v) || v.length > 200))
      return NextResponse.json({ error: 'invalid_site' }, { status: 400 })
    update.site = v
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[PATCH /api/me]', error)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  return NextResponse.json({ me: profileToMe(data as ProfileRow) })
}

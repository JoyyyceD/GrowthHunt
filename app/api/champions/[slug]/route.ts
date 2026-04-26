import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { championToDTO, commentToDTO } from '@/lib/opc-mappers'
import type { ChampionRow, CommentRow, ProfileRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

// GET /api/champions/[slug] — detail + last 50 comments (newest first)
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = await createServerClient()

  const { data: row, error } = await supabase
    .from('champions')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const champion = row as ChampionRow

  // Comments + author profile via foreign select
  const { data: commentsData } = await supabase
    .from('comments')
    .select('*, author:profiles!author_id(*)')
    .eq('champion_id', champion.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const commentRows = (commentsData ?? []) as unknown as Array<CommentRow & { author: ProfileRow | null }>
  const comments = commentRows.map((c) => commentToDTO(c))

  return NextResponse.json({
    champion: championToDTO(champion),
    comments,
  })
}

// PATCH /api/champions/[slug] — owner edits
export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params
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
    update.name = v
  }
  if (typeof body.tagline === 'string') {
    const v = body.tagline.trim()
    if (!v || v.length > 100) return NextResponse.json({ error: 'invalid_tagline' }, { status: 400 })
    update.tagline = v
  }
  if ('about' in body) {
    const v = body.about == null ? null : String(body.about).trim()
    if (v && v.length > 1000) return NextResponse.json({ error: 'invalid_about' }, { status: 400 })
    update.about = v
  }
  if ('url' in body) {
    const v = body.url == null ? null : String(body.url).trim()
    if (v && !/^https?:\/\//i.test(v)) return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
    update.url = v
  }
  if ('category' in body) update.category = body.category == null ? null : String(body.category).trim()
  if ('hue' in body) {
    const v = body.hue == null ? null : String(body.hue).trim().toLowerCase()
    if (v && !/^#[0-9a-f]{6}$/i.test(v)) return NextResponse.json({ error: 'invalid_hue' }, { status: 400 })
    update.hue = v
  }
  if ('founderType' in body) update.founder_type = body.founderType == null ? null : String(body.founderType)
  if ('status' in body) {
    update.status = body.status === 'soon' ? 'soon' : 'live'
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  // RLS enforces owner_id = auth.uid() on update
  const { data, error } = await supabase
    .from('champions')
    .update(update)
    .eq('slug', slug)
    .eq('owner_id', user.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 })
  }
  return NextResponse.json({ champion: championToDTO(data as ChampionRow) })
}

// DELETE /api/champions/[slug] — owner soft-delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { error, data } = await supabase
    .from('champions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('slug', slug)
    .eq('owner_id', user.id)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { championToDTO, hotScore, slugifyName } from '@/lib/opc-mappers'
import { rateLimit, RATE } from '@/lib/rate-limit'
import type { ChampionRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

// GET /api/champions?sort=hot|new|top&category=...&featured=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sort = (searchParams.get('sort') ?? 'hot') as 'hot' | 'new' | 'top'
  const category = searchParams.get('category')
  const featured = searchParams.get('featured')
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500)

  const supabase = await createServerClient()
  let q = supabase
    .from('champions')
    .select('*')
    .is('deleted_at', null)
    .limit(limit)

  if (category) q = q.eq('category', category)
  if (featured === 'true') q = q.eq('featured', true)

  if (sort === 'new') {
    q = q.order('created_at', { ascending: false })
  } else if (sort === 'top') {
    q = q.order('upvote_count', { ascending: false })
  } else {
    // 'hot' — fetch then sort in JS by hot_score (small N for MVP)
    q = q.order('created_at', { ascending: false })
  }

  const { data, error } = await q
  if (error) {
    console.error('[GET /api/champions]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let rows = (data ?? []) as ChampionRow[]
  if (sort === 'hot') {
    rows = rows
      .map((r) => ({
        r,
        score: hotScore(
          r.upvote_count,
          (Date.now() - Date.parse(r.created_at)) / 3_600_000
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r)
  }

  return NextResponse.json({ champions: rows.map(championToDTO) })
}

// POST /api/champions  body: { name, tagline, about, url, category, hue, founderType }
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const limit = rateLimit(`submit:${user.id}`, RATE.submit.max, RATE.submit.windowSec)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: limit.retryAfterSec },
      { status: 429 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const tagline = String(body.tagline ?? '').trim()
  const about = body.about ? String(body.about).trim() : null
  const url = body.url ? String(body.url).trim() : null
  const category = body.category ? String(body.category).trim() : null
  const hue = body.hue ? String(body.hue).trim() : null
  const founderType = body.founderType ? String(body.founderType).trim() : null
  const status = body.status === 'soon' ? 'soon' : 'live'

  // Validation
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  }
  if (!tagline || tagline.length > 100) {
    return NextResponse.json({ error: 'invalid_tagline' }, { status: 400 })
  }
  if (about && about.length > 1000) {
    return NextResponse.json({ error: 'invalid_about' }, { status: 400 })
  }
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }
  if (hue && !/^#[0-9a-f]{6}$/i.test(hue)) {
    return NextResponse.json({ error: 'invalid_hue' }, { status: 400 })
  }

  // Slug = slugify(name) + 4-char random suffix.  Retry on conflict (rare).
  const admin = createAdminClient()
  const baseSlug = slugifyName(name)
  let slug = baseSlug
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 6)
    slug = `${baseSlug}-${suffix}`
    // ensure user (not admin) is the author so RLS passes
    const { data, error } = await supabase
      .from('champions')
      .insert({
        slug,
        name,
        tagline,
        about,
        url,
        category,
        hue: hue?.toLowerCase() ?? null,
        founder_type: founderType,
        by_name: null, // by_name comes from profile display_name; clients can set later
        status,
        owner_id: user.id,
        source: 'user',
      })
      .select('*')
      .single()

    if (!error && data) {
      return NextResponse.json({ champion: championToDTO(data as ChampionRow) }, { status: 201 })
    }
    if (error?.code === '23505') continue // unique_violation, retry
    console.error('[POST /api/champions]', error)
    return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 500 })
  }

  // unused but quiets TS
  void admin
  return NextResponse.json({ error: 'slug_conflict' }, { status: 500 })
}

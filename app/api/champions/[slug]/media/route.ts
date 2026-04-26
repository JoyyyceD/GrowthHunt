import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { championToDTO } from '@/lib/opc-mappers'
import { rateLimit, RATE } from '@/lib/rate-limit'
import type { ChampionRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

const SLOT_TO_COLUMN: Record<string, 'logo_url' | 'image1_url' | 'image2_url'> = {
  logo: 'logo_url',
  screenshot1: 'image1_url',
  screenshot2: 'image2_url',
}

// POST /api/champions/[slug]/media?slot=logo|screenshot1|screenshot2
// FormData: { file: File }
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const slot = searchParams.get('slot') ?? 'logo'
  const column = SLOT_TO_COLUMN[slot]
  if (!column) {
    return NextResponse.json({ error: 'invalid_slot' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const rl = rateLimit(`media:${user.id}`, RATE.media.max, RATE.media.windowSec)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    )
  }

  // Owner check via slug
  const { data: champion, error: cErr } = await supabase
    .from('champions')
    .select('id, slug, owner_id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()
  if (cErr || !champion) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (champion.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'invalid_form' }, { status: 400 }) }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 })

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_media_type', mime: file.type }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large', size: file.size, max: MAX_BYTES }, { status: 413 })
  }

  // Path: logos/<id>.<ext>  or  screenshots/<id>/<n>.<ext>
  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'png').toLowerCase().slice(0, 5)
  const path =
    slot === 'logo'
      ? `logos/${champion.id}.${ext}`
      : `screenshots/${champion.id}/${slot.replace('screenshot', '')}.${ext}`

  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('opchampion-media')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    })
  if (upErr) {
    console.error('[media upload]', upErr)
    return NextResponse.json({ error: 'upload_failed', detail: upErr.message }, { status: 500 })
  }

  const { data: pub } = admin.storage.from('opchampion-media').getPublicUrl(path)
  const publicUrl = `${pub.publicUrl}?v=${Date.now()}`

  // Write URL back to champion row (RLS lets owner update)
  const { data: updated, error: updErr } = await supabase
    .from('champions')
    .update({ [column]: publicUrl })
    .eq('id', champion.id)
    .eq('owner_id', user.id)
    .select('*')
    .single()

  if (updErr || !updated) {
    console.error('[media url update]', updErr)
    return NextResponse.json({ error: 'url_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ champion: championToDTO(updated as ChampionRow), url: publicUrl })
}

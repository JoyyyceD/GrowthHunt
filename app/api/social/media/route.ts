/**
 * POST /api/social/media — upload an image/video for a scheduled post.
 *   multipart/form-data: { file: File, ws: workspaceId }
 *   → { ok, media: MediaItem }
 *
 * Stores in the public `post-media` bucket under <workspaceId>/<uuid>.<ext> via
 * the service-role client, then returns the public URL. The publish adapters
 * fetch the bytes from that URL at send time.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspace } from '@/lib/workspace/store'
import {
  MEDIA_BUCKET, MEDIA_LIMITS, isAllowedMime, kindFromMime, extFromMime, type MediaItem,
} from '@/lib/social/media'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 }) }

  const wsId = String(form.get('ws') || '')
  const file = form.get('file')
  if (!wsId) return NextResponse.json({ error: 'ws required' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const ws = await getWorkspace(wsId)
  if (!ws) return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const mime = file.type || ''
  if (!isAllowedMime(mime)) {
    return NextResponse.json({ error: `unsupported type: ${mime || 'unknown'} (allowed: jpg/png/webp/gif, mp4/mov)` }, { status: 400 })
  }
  const kind = kindFromMime(mime)!
  const cap = MEDIA_LIMITS[kind].maxBytes
  if (file.size > cap) {
    return NextResponse.json({ error: `${kind} too large: ${(file.size / 1048576).toFixed(1)}MB > ${(cap / 1048576).toFixed(0)}MB` }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const path = `${ws.id}/${id}.${extFromMime(mime)}`
  const buf = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error: upErr } = await admin.storage.from(MEDIA_BUCKET).upload(path, buf, {
    contentType: mime,
    upsert: false,
  })
  if (upErr) return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 })

  const { data: pub } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  const media: MediaItem = { id, path, url: pub.publicUrl, kind, mime, bytes: file.size }
  return NextResponse.json({ ok: true, media })
}

/**
 * DELETE /api/social/media?path=<storage path>&ws=<workspaceId>
 * Removes an uploaded object the user attached but didn't end up posting.
 */
export async function DELETE(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path') || ''
  const wsId = req.nextUrl.searchParams.get('ws') || ''
  if (!path || !wsId) return NextResponse.json({ error: 'path and ws required' }, { status: 400 })

  const ws = await getWorkspace(wsId)
  if (!ws) return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  // Defense-in-depth: only let an owner delete objects under their workspace folder.
  if (!path.startsWith(`${ws.id}/`)) return NextResponse.json({ error: 'forbidden path' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin.storage.from(MEDIA_BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

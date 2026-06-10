/**
 * /api/scout/assets?ws=<workspaceId>
 *   GET  → list uploaded brand assets (public URLs) + workspace palette
 *   POST → multipart upload (image, ≤5MB, max SCOUT_ASSET_LIMIT per workspace)
 */
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'scout-assets'
const ASSET_LIMIT = Number(process.env.SCOUT_ASSET_LIMIT || '3')
const MAX_BYTES = 5 * 1024 * 1024

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  const admin = createAdminClient()
  const { data: files } = await admin.storage.from(BUCKET).list(auth.workspace.id, { limit: 50 })
  const assets = (files || [])
    .filter(f => f.name)
    .map(f => ({
      name: f.name,
      url: admin.storage.from(BUCKET).getPublicUrl(`${auth.workspace.id}/${f.name}`).data.publicUrl,
      created_at: f.created_at,
    }))
  return Response.json({
    assets,
    limit: ASSET_LIMIT,
    brandColor: auth.workspace.brand_color || null,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') return Response.json({ error: 'file required' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'max 5MB per file' }, { status: 400 })
  if (!file.type.startsWith('image/')) return Response.json({ error: 'images only' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin.storage.from(BUCKET).list(auth.workspace.id, { limit: 100 })
  const userAssets = (existing || []).filter(f => !f.name.startsWith('logo'))
  if (userAssets.length >= ASSET_LIMIT) {
    return Response.json({ error: `asset limit reached (${ASSET_LIMIT})` }, { status: 403 })
  }

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`.slice(0, 80)
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(`${auth.workspace.id}/${safeName}`, file, { contentType: file.type })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({
    ok: true,
    url: admin.storage.from(BUCKET).getPublicUrl(`${auth.workspace.id}/${safeName}`).data.publicUrl,
  })
}

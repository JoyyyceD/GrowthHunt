/**
 * POST /api/social/posts — unified schedule/post-now endpoint.
 *   body: { workspace_id, content, platforms[], when? }
 *   Picks native adapter when a social_connections row exists, otherwise
 *   falls back to Postiz when a postiz_connections row exists.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { unifiedSchedule } from '@/lib/social/schedule'
import { coerceMediaArray } from '@/lib/social/media'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; content?: string; platforms?: string[]; when?: string | null; options?: Record<string, Record<string, unknown>>; media?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const ws = await getWorkspace(body.workspace_id)
  if (!ws) return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const content = (body.content || '').trim()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })
  const platforms = Array.isArray(body.platforms) && body.platforms.length > 0
    ? body.platforms.map(String).filter(Boolean)
    : undefined

  const result = await unifiedSchedule({
    workspaceId: ws.id,
    content,
    platforms,
    when: body.when ?? null,
    source: 'scheduler_ui',
    options: body.options,
    media: coerceMediaArray(body.media),
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}

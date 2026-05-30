/**
 * GET  /api/postiz/posts?ws=…   — list the local mirror (queue + history)
 * POST /api/postiz/posts        — schedule/post via Postiz
 *      body: { workspace_id, content, integration_ids?[], platforms?[], when? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { listScheduledPosts } from '@/lib/postiz/store'
import { schedulePost } from '@/lib/postiz/schedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function authed(wsId: string | null) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (!wsId) return { error: NextResponse.json({ error: 'ws required' }, { status: 400 }) }
  const ws = await getWorkspace(wsId)
  if (!ws) return { error: NextResponse.json({ error: 'workspace not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws }
}

export async function GET(req: NextRequest) {
  const ctx = await authed(req.nextUrl.searchParams.get('ws'))
  if ('error' in ctx) return ctx.error
  const posts = await listScheduledPosts(ctx.ws.id)
  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; content?: string; integration_ids?: string[]; platforms?: string[]; when?: string | null }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const ctx = await authed(body.workspace_id ?? null)
  if ('error' in ctx) return ctx.error

  const content = (body.content || '').trim()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const result = await schedulePost({
    workspaceId: ctx.ws.id,
    content,
    integrationIds: Array.isArray(body.integration_ids) ? body.integration_ids : undefined,
    platforms: Array.isArray(body.platforms) ? body.platforms : undefined,
    when: body.when ?? null,
    source: 'scheduler_ui',
  })

  const status = result.ok ? 200 : (result.notConnected ? 400 : 502)
  return NextResponse.json(result, { status })
}

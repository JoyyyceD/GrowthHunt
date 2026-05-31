/**
 * PATCH /api/social/posts/[id] — edit scheduled post (content and/or scheduled_for).
 *   body: { content?: string, scheduled_for?: string }
 *   Only allowed when status='scheduled'.
 * DELETE /api/social/posts/[id] — cancel scheduled post (status=canceled).
 *   Only allowed when status='scheduled'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspace } from '@/lib/workspace/store'

export const dynamic = 'force-dynamic'

async function loadOwnedPost(id: string, userId: string) {
  const admin = createAdminClient()
  const { data: post } = await admin
    .from('gtm_scheduled_posts')
    .select('id, workspace_id, status, content, scheduled_for, platform')
    .eq('id', id)
    .single()
  if (!post) return { error: 'not found', status: 404 as const }
  const ws = await getWorkspace(post.workspace_id)
  if (!ws) return { error: 'workspace gone', status: 404 as const }
  if (ws.owner_id && ws.owner_id !== userId) return { error: 'forbidden', status: 403 as const }
  return { post, admin }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { content?: string; scheduled_for?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const r = await loadOwnedPost(id, user.id)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (r.post.status !== 'scheduled') {
    return NextResponse.json({ error: `cannot edit a ${r.post.status} post` }, { status: 409 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.content === 'string') {
    const c = body.content.trim()
    if (!c) return NextResponse.json({ error: 'content cannot be empty' }, { status: 400 })
    patch.content = c
  }
  if (typeof body.scheduled_for === 'string') {
    const t = Date.parse(body.scheduled_for)
    if (!Number.isFinite(t)) return NextResponse.json({ error: 'invalid scheduled_for' }, { status: 400 })
    if (t < Date.now() - 60_000) return NextResponse.json({ error: 'scheduled_for must be in the future' }, { status: 400 })
    patch.scheduled_for = new Date(t).toISOString()
  }
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data, error } = await r.admin
    .from('gtm_scheduled_posts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, post: data })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const r = await loadOwnedPost(id, user.id)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (r.post.status !== 'scheduled') {
    return NextResponse.json({ error: `cannot cancel a ${r.post.status} post` }, { status: 409 })
  }

  const { error } = await r.admin
    .from('gtm_scheduled_posts')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

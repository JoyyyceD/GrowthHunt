/**
 * PATCH /api/scout/queue/[id]?ws=<workspaceId> { action, content?, scheduled_for? }
 *   approve → proposed → scheduled (requires a platform connection; X also
 *             accepts BYO keys). Edits may ride along with an approve.
 *   edit    → update content / scheduled_for, keep status
 *   cancel  → remove from queue
 */
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFirstConnection } from '@/lib/social/store'
import { getXKeysForWorkspace } from '@/lib/social/x-byo'
import { isSocialPlatform } from '@/lib/social/registry'
import { requireWorkspace } from '@/lib/scout/auth'
import type { SocialPlatform } from '@/lib/social/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth

  let body: { action?: string; content?: string; scheduled_for?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: post } = await admin
    .from('gtm_scheduled_posts')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', auth.workspace.id)
    .maybeSingle()
  if (!post) return Response.json({ error: 'post not found' }, { status: 404 })

  if (body.action === 'cancel') {
    await admin.from('gtm_scheduled_posts').delete().eq('id', id)
    return Response.json({ ok: true })
  }

  if (body.action === 'edit') {
    await admin
      .from('gtm_scheduled_posts')
      .update({
        content: body.content ?? post.content,
        scheduled_for: body.scheduled_for ?? post.scheduled_for,
      })
      .eq('id', id)
    return Response.json({ ok: true })
  }

  if (body.action === 'approve') {
    if (post.status !== 'proposed') return Response.json({ error: `cannot approve a ${post.status} post` }, { status: 400 })
    const platform = String(post.platform)
    let integrationId: string = post.integration_id || ''
    if (isSocialPlatform(platform)) {
      const conn = await getFirstConnection(auth.workspace.id, platform as SocialPlatform)
      if (conn) integrationId = conn.id
    }
    if (!integrationId && platform === 'x') {
      const byo = await getXKeysForWorkspace(auth.workspace.id)
      if (byo) integrationId = 'x-byo'
    }
    if (!integrationId) {
      return Response.json({ needsConnection: true, platform })
    }
    const scheduledFor = body.scheduled_for ?? post.scheduled_for ?? new Date(Date.now() + 10 * 60_000).toISOString()
    await admin
      .from('gtm_scheduled_posts')
      .update({
        status: 'scheduled',
        integration_id: integrationId,
        content: body.content ?? post.content,
        scheduled_for: scheduledFor,
      })
      .eq('id', id)
    return Response.json({ ok: true, scheduled_for: scheduledFor })
  }

  return Response.json({ error: 'unknown action' }, { status: 400 })
}

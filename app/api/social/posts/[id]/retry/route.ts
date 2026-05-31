/**
 * POST /api/social/posts/[id]/retry — requeue a failed post for the next cron run.
 *   Sets status=scheduled, scheduled_for=now, clears error/retry_count.
 *   Only allowed when status='failed'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspace } from '@/lib/workspace/store'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: post } = await admin
    .from('gtm_scheduled_posts')
    .select('id, workspace_id, status')
    .eq('id', id)
    .single()
  if (!post) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const ws = await getWorkspace(post.workspace_id)
  if (!ws) return NextResponse.json({ error: 'workspace gone' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (post.status !== 'failed') {
    return NextResponse.json({ error: `cannot retry a ${post.status} post` }, { status: 409 })
  }

  const { data, error } = await admin
    .from('gtm_scheduled_posts')
    .update({
      status: 'scheduled',
      scheduled_for: new Date().toISOString(),
      error: null,
      retry_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, post: data })
}

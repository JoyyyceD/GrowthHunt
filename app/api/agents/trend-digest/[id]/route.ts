/**
 * PATCH /api/agents/trend-digest/[id]
 *   Body: { status: 'saved' | 'dismissed' | 'posted', posted_tweet_id? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateCandidateStatus } from '@/lib/agents/trend-digest'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['saved', 'dismissed', 'posted'])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data: row } = await admin.from('trend_candidates').select('id, workspace_id').eq('id', id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id').eq('id', row.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let body: { status?: string; posted_tweet_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.status || !ALLOWED.has(body.status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  await updateCandidateStatus(id, body.status as 'saved' | 'dismissed' | 'posted', body.posted_tweet_id)
  return NextResponse.json({ ok: true })
}

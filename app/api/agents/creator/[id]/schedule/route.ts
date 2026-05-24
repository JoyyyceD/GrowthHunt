/**
 * PATCH /api/agents/creator/[id]/schedule
 * Body: { scheduled_for: ISO string | null }
 *
 * Sets/clears the scheduled_for timestamp on a draft. The daily reminder
 * cron picks up rows where scheduled_for <= now() and status='queued'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: draft } = await admin.from('outreach_drafts').select('id, workspace_id').eq('id', id).maybeSingle()
  if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id').eq('id', draft.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: { scheduled_for?: string | null }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  let scheduledFor: string | null = null
  if (body.scheduled_for) {
    const t = Date.parse(body.scheduled_for)
    if (!Number.isFinite(t)) return NextResponse.json({ error: 'invalid scheduled_for' }, { status: 400 })
    scheduledFor = new Date(t).toISOString()
  }
  await admin.from('outreach_drafts').update({ scheduled_for: scheduledFor }).eq('id', id)
  return NextResponse.json({ ok: true, scheduled_for: scheduledFor })
}

/**
 * PATCH /api/agents/radar/[id]
 * Body: { status: 'saved' | 'dismissed' | 'replied' }
 *
 * Updates the lead's status from the inbox.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['saved', 'dismissed', 'replied', 'new'])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: lead } = await admin.from('radar_leads').select('id, workspace_id').eq('id', id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id').eq('id', lead.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: { status?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.status || !ALLOWED.has(body.status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })

  const { error } = await admin.from('radar_leads').update({ status: body.status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

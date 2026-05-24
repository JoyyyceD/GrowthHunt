/**
 * PATCH /api/agents/creator/[id]
 * Body: { status: 'sent' | 'skipped' | 'replied', reply_text?: string }
 *
 * Updates a single draft's status. Used after the user manually sends the
 * DM in X or clicks Skip.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateDraftStatus } from '@/lib/agents/creator'

export const dynamic = 'force-dynamic'

const ALLOWED: ReadonlyArray<'sent' | 'skipped' | 'replied'> = ['sent', 'skipped', 'replied']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Ownership check — join through workspace
  const admin = createAdminClient()
  const { data: draft } = await admin
    .from('outreach_drafts')
    .select('id, workspace_id')
    .eq('id', id)
    .maybeSingle()
  if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: ws } = await admin
    .from('gtm_workspaces')
    .select('owner_id')
    .eq('id', draft.workspace_id)
    .maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { status?: string; reply_text?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!ALLOWED.includes(body.status as 'sent' | 'skipped' | 'replied')) {
    return NextResponse.json({ error: 'status must be sent | skipped | replied' }, { status: 400 })
  }

  const ok = await updateDraftStatus(id, body.status as 'sent' | 'skipped' | 'replied')
  if (!ok) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  if (body.status === 'replied' && body.reply_text) {
    await admin.from('outreach_drafts').update({ reply_text: body.reply_text }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}

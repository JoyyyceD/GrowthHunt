/**
 * POST /api/agents/cold-email/[id]/send
 *
 * Sends a single drafted email via Brevo. Validates ownership through the
 * draft → workspace chain. Caps daily volume via existing geo_usage helper
 * so a runaway loop can't blast emails.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendColdEmailDraft } from '@/lib/agents/cold-email'
import { checkUsage } from '@/lib/geo/usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const DAILY_SEND_LIMIT = 50  // per user, indie volume

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: draft } = await admin.from('outreach_drafts').select('id, workspace_id').eq('id', id).maybeSingle()
  if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id').eq('id', draft.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const usage = await checkUsage(`cold-email-send:${user.id}`, DAILY_SEND_LIMIT)
    if (!usage.allowed) {
      return NextResponse.json({ error: `Daily send limit (${DAILY_SEND_LIMIT}) reached.`, used: usage.used, limit: usage.limit }, { status: 429 })
    }
  } catch { /* salt missing → allow */ }

  const out = await sendColdEmailDraft(id)
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: 502 })
  return NextResponse.json({ ok: true })
}

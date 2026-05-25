/**
 * GET    /api/agents/launch-orchestrator/[id]
 * PATCH  /api/agents/launch-orchestrator/[id]  Body: { checklist, status? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaign, updateCampaignChecklist } from '@/lib/agents/launch-orchestrator'

export const dynamic = 'force-dynamic'

async function authorize(id: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const c = await getCampaign(id)
  if (!c) return { error: NextResponse.json({ error: 'not found' }, { status: 404 }) }
  const admin = createAdminClient()
  const { data: ws } = await admin.from('gtm_workspaces').select('owner_id').eq('id', c.workspace_id).maybeSingle()
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { campaign: c }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await authorize(id)
  if ('error' in g) return g.error
  return NextResponse.json({ campaign: g.campaign })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await authorize(id)
  if ('error' in g) return g.error
  let body: { checklist?: unknown; status?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!Array.isArray(body.checklist)) return NextResponse.json({ error: 'checklist array required' }, { status: 400 })
  await updateCampaignChecklist(id, body.checklist as Parameters<typeof updateCampaignChecklist>[1], body.status)
  return NextResponse.json({ ok: true })
}

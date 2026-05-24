/**
 * /api/workspace/[id]
 *   GET    → fetch a workspace (owner-scoped)
 *   PATCH  → update fields (body: WorkspacePatch)
 *   DELETE → remove it
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace, patchWorkspace, deleteWorkspace } from '@/lib/workspace/store'

export const dynamic = 'force-dynamic'

async function authorize(id: string): Promise<{ ok: boolean; status?: number; reason?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, reason: 'unauthorized' }
  const ws = await getWorkspace(id)
  if (!ws) return { ok: false, status: 404, reason: 'not found' }
  if (ws.owner_id && ws.owner_id !== user.id) return { ok: false, status: 403, reason: 'forbidden' }
  return { ok: true }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await authorize(id)
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status })
  const workspace = await getWorkspace(id)
  return NextResponse.json({ workspace })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await authorize(id)
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status })
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const workspace = await patchWorkspace(id, body)
  if (!workspace) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ workspace })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await authorize(id)
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status })
  const ok = await deleteWorkspace(id)
  if (!ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

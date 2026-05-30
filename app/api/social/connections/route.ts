/**
 * GET    /api/social/connections?ws=…       — list this workspace's native connections
 * DELETE /api/social/connections?id=…&ws=…  — disconnect a specific account
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { listConnections, getConnectionById, deleteConnection } from '@/lib/social/store'

export const dynamic = 'force-dynamic'

async function authed(wsId: string | null) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (!wsId) return { error: NextResponse.json({ error: 'ws required' }, { status: 400 }) }
  const ws = await getWorkspace(wsId)
  if (!ws) return { error: NextResponse.json({ error: 'workspace not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws, userId: user.id }
}

export async function GET(req: NextRequest) {
  const ctx = await authed(req.nextUrl.searchParams.get('ws'))
  if ('error' in ctx) return ctx.error
  const list = await listConnections(ctx.ws.id)
  // Strip tokens — UI never needs them.
  const safe = list.map((c) => ({
    id: c.id, platform: c.platform, account_handle: c.account_handle, account_id: c.account_id,
    scopes: c.scopes, expires_at: c.expires_at, needs_reconnect: c.needs_reconnect, reconnect_reason: c.reconnect_reason,
  }))
  return NextResponse.json({ connections: safe })
}

export async function DELETE(req: NextRequest) {
  const wsId = req.nextUrl.searchParams.get('ws')
  const id = req.nextUrl.searchParams.get('id')
  const ctx = await authed(wsId)
  if ('error' in ctx) return ctx.error
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const conn = await getConnectionById(id)
  if (!conn || conn.workspace_id !== ctx.ws.id) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const ok = await deleteConnection(id)
  return NextResponse.json({ ok })
}

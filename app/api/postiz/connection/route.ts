/**
 * POST   /api/postiz/connection  — save + verify a workspace's Postiz creds
 * GET    /api/postiz/connection?ws=… — connection status (never returns the key)
 * DELETE /api/postiz/connection?ws=… — disconnect
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { ping } from '@/lib/postiz/client'
import { saveConnection, deleteConnection, getConnection, cacheIntegrations } from '@/lib/postiz/store'
import { listIntegrations } from '@/lib/postiz/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function authedWorkspace(req: NextRequest, wsId: string | null) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (!wsId) return { error: NextResponse.json({ error: 'ws required' }, { status: 400 }) }
  const ws = await getWorkspace(wsId)
  if (!ws) return { error: NextResponse.json({ error: 'workspace not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws, userId: user.id }
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; api_url?: string; api_key?: string; label?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const ctx = await authedWorkspace(req, body.workspace_id ?? null)
  if ('error' in ctx) return ctx.error

  const apiUrl = (body.api_url || 'https://api.postiz.com/public/v1').trim().replace(/\/+$/, '')
  const apiKey = (body.api_key || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'api_key required' }, { status: 400 })

  // Verify by hitting /integrations.
  const probe = await ping({ apiUrl, apiKey })
  if (!probe.ok) {
    return NextResponse.json({ error: `Could not reach Postiz: ${probe.error}` }, { status: 400 })
  }

  const saved = await saveConnection(ctx.ws.id, apiUrl, apiKey, body.label)
  if (!saved) return NextResponse.json({ error: 'could not save connection' }, { status: 500 })

  // Warm the integrations cache right away.
  try {
    const integ = await listIntegrations({ apiUrl, apiKey })
    await cacheIntegrations(ctx.ws.id, integ)
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, integrations: probe.integrations })
}

export async function GET(req: NextRequest) {
  const wsId = req.nextUrl.searchParams.get('ws')
  const ctx = await authedWorkspace(req, wsId)
  if ('error' in ctx) return ctx.error
  const conn = await getConnection(ctx.ws.id)
  return NextResponse.json({
    connected: Boolean(conn),
    api_url: conn?.api_url ?? null,
    label: conn?.label ?? null,
    last_synced_at: conn?.last_synced_at ?? null,
  })
}

export async function DELETE(req: NextRequest) {
  const wsId = req.nextUrl.searchParams.get('ws')
  const ctx = await authedWorkspace(req, wsId)
  if ('error' in ctx) return ctx.error
  const ok = await deleteConnection(ctx.ws.id)
  return NextResponse.json({ ok })
}

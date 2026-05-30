/**
 * GET  /api/postiz/integrations?ws=…       — cached connected channels
 * POST /api/postiz/integrations            — refresh cache from Postiz
 *      body: { workspace_id }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { listIntegrations } from '@/lib/postiz/client'
import { getCreds, listCachedIntegrations, cacheIntegrations, markSynced } from '@/lib/postiz/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function authed(wsId: string | null) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (!wsId) return { error: NextResponse.json({ error: 'ws required' }, { status: 400 }) }
  const ws = await getWorkspace(wsId)
  if (!ws) return { error: NextResponse.json({ error: 'workspace not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws }
}

export async function GET(req: NextRequest) {
  const ctx = await authed(req.nextUrl.searchParams.get('ws'))
  if ('error' in ctx) return ctx.error
  const integrations = await listCachedIntegrations(ctx.ws.id)
  return NextResponse.json({ integrations })
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const ctx = await authed(body.workspace_id ?? null)
  if ('error' in ctx) return ctx.error

  const creds = await getCreds(ctx.ws.id)
  if (!creds) return NextResponse.json({ error: 'not connected' }, { status: 400 })

  try {
    const integ = await listIntegrations(creds)
    await cacheIntegrations(ctx.ws.id, integ)
    await markSynced(ctx.ws.id)
    return NextResponse.json({ ok: true, integrations: integ })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'refresh failed' }, { status: 502 })
  }
}

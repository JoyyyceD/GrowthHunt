/**
 * GET    /api/mcp/key?ws=…  — view existing key (revealed once on generation;
 *                              subsequent GETs return a redacted hint).
 * POST   /api/mcp/key       — generate a new key (rotates if one exists).
 *        body: { workspace_id }
 * DELETE /api/mcp/key?ws=…  — revoke the key.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { generateMcpKey, getKeyForWorkspace, setKeyForWorkspace } from '@/lib/mcp/key'

export const dynamic = 'force-dynamic'

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

function redact(k: string | null): string | null {
  if (!k) return null
  return k.slice(0, 10) + '…' + k.slice(-4)
}

export async function GET(req: NextRequest) {
  const ctx = await authed(req.nextUrl.searchParams.get('ws'))
  if ('error' in ctx) return ctx.error
  const key = await getKeyForWorkspace(ctx.ws.id)
  return NextResponse.json({ has_key: Boolean(key), key_hint: redact(key) })
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const ctx = await authed(body.workspace_id ?? null)
  if ('error' in ctx) return ctx.error
  const key = generateMcpKey()
  const ok = await setKeyForWorkspace(ctx.ws.id, key)
  if (!ok) return NextResponse.json({ error: 'could not save key' }, { status: 500 })
  return NextResponse.json({ key })  // revealed once
}

export async function DELETE(req: NextRequest) {
  const ctx = await authed(req.nextUrl.searchParams.get('ws'))
  if ('error' in ctx) return ctx.error
  const ok = await setKeyForWorkspace(ctx.ws.id, null)
  return NextResponse.json({ ok })
}

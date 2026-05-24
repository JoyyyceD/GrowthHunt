/**
 * /api/agents/ab
 *   POST → create an A/B test (body: { workspace_id, name, target_url, copies[] })
 *   GET  → list tests for a workspace
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { createAbTest, listAbTests } from '@/lib/agents/ab'

export const dynamic = 'force-dynamic'

async function gate(workspaceId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const ws = await getWorkspace(workspaceId)
  if (!ws) return { error: NextResponse.json({ error: 'not found' }, { status: 404 }) }
  if (ws.owner_id && ws.owner_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { ws }
}

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; name?: string; target_url?: string; copies?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!body.target_url?.trim()) return NextResponse.json({ error: 'target_url required' }, { status: 400 })
  if (!Array.isArray(body.copies) || body.copies.length < 2) return NextResponse.json({ error: 'need at least 2 copy variants' }, { status: 400 })

  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error

  const result = await createAbTest({
    workspaceId: body.workspace_id,
    name: body.name,
    targetUrl: body.target_url,
    copies: body.copies.filter((c): c is string => typeof c === 'string'),
  })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ test: result })
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const tests = await listAbTests(workspaceId)
  return NextResponse.json({ tests })
}

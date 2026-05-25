/**
 * /api/agents/launch-orchestrator
 *   POST → create a new launch campaign
 *   GET  → list campaigns for workspace
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { createCampaign, listCampaigns, ALL_PLATFORMS, type LaunchPlatform } from '@/lib/agents/launch-orchestrator'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
  let body: { workspace_id?: string; name?: string; product_url?: string; tagline?: string; launch_at?: string; platforms?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!body.product_url?.trim()) return NextResponse.json({ error: 'product_url required' }, { status: 400 })
  if (!body.launch_at) return NextResponse.json({ error: 'launch_at required (ISO)' }, { status: 400 })

  const platforms = (Array.isArray(body.platforms) ? body.platforms : [])
    .filter((p): p is LaunchPlatform => typeof p === 'string' && (ALL_PLATFORMS as string[]).includes(p))

  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error

  const out = await createCampaign({
    workspace: g.ws,
    name: body.name,
    productUrl: body.product_url,
    tagline: body.tagline?.trim() || undefined,
    launchAt: body.launch_at,
    platforms,
  })
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: 400 })
  return NextResponse.json({ campaign: out })
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const campaigns = await listCampaigns(g.ws.id)
  return NextResponse.json({ campaigns })
}

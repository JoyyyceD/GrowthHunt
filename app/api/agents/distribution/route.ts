/**
 * /api/agents/distribution
 *   POST → generate platform variants for a canonical post
 *   GET  → list distribution posts for a workspace
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runDistribution, listDistributionPosts, PLATFORM_ORDER, type PlatformId } from '@/lib/agents/distribution'

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
  let body: { workspace_id?: string; topic?: string; source_url?: string; platforms?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  if (!body.topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error

  const platforms = Array.isArray(body.platforms)
    ? body.platforms.filter((p): p is PlatformId => typeof p === 'string' && (PLATFORM_ORDER as string[]).includes(p))
    : undefined

  const out = await runDistribution({
    workspace: g.ws,
    topic: body.topic.trim(),
    sourceUrl: body.source_url?.trim() || undefined,
    platforms,
  })
  return NextResponse.json(out)
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const posts = await listDistributionPosts(workspaceId)
  return NextResponse.json({ posts })
}

/**
 * /api/agents/post-roi
 *   POST → ingest user's recent posts + build a digest (returns digest, also persists)
 *   GET  → return the most recent persisted digest
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { ingestSelfPosts, buildRoiDigest, persistDigest, latestDigest } from '@/lib/agents/post-roi'
import { recordTask } from '@/lib/orchestrator/tasks'

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
  let body: { workspace_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(body.workspace_id)
  if ('error' in g) return g.error

  const { result } = await recordTask({
    kind: 'chat_turn', // re-use as a "data refresh" task kind; v2 add a 'post_roi' kind
    workspace_id: g.ws.id,
    triggered_by: 'manual_page',
    input: { handle: g.ws.voice_handle },
    summary: 'Refreshing self-post ROI…',
    summaryFromResult: (r: { fetched: number; digest: { posts_count: number } }) => `Ingested ${r.fetched} tweets; digest covers ${r.digest.posts_count}`,
  }, async () => {
    const ingest = await ingestSelfPosts(g.ws)
    const digest = await buildRoiDigest(g.ws)
    await persistDigest(digest)
    return { ingest, digest, fetched: ingest.fetched }
  })

  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  const g = await gate(workspaceId)
  if ('error' in g) return g.error
  const digest = await latestDigest(g.ws.id)
  return NextResponse.json({ digest })
}

/**
 * GET /api/social/reddit/subreddits?ws=<workspaceId>
 * Lists the connected Reddit account's subscribed subreddits so the Compose UI
 * can offer a target picker. Returns { subreddits: [{name, title, subscribers}] }.
 * Empty list when Reddit isn't connected for the workspace (not an error).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getFirstConnection } from '@/lib/social/store'
import { redditListSubreddits } from '@/lib/social/adapters/reddit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const wsId = req.nextUrl.searchParams.get('ws')
  if (!wsId) return NextResponse.json({ error: 'ws required' }, { status: 400 })
  const ws = await getWorkspace(wsId)
  if (!ws) return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const conn = await getFirstConnection(ws.id, 'reddit')
  if (!conn) return NextResponse.json({ subreddits: [] })

  const subreddits = await redditListSubreddits(conn, 100)
  // Most-subscribed first — the ones a founder is likeliest to post to.
  subreddits.sort((a, b) => b.subscribers - a.subscribers)
  return NextResponse.json({ subreddits })
}

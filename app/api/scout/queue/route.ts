/** GET /api/scout/queue?ws=<workspaceId> — publish queue for the right rail. */
import { NextRequest } from 'next/server'
import { listScheduledPosts } from '@/lib/postiz/store'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  const posts = await listScheduledPosts(auth.workspace.id, 50)
  return Response.json({
    posts: posts.map(p => ({
      id: p.id,
      platform: p.platform,
      status: p.status,
      content: p.content,
      scheduled_for: p.scheduled_for,
    })),
  })
}

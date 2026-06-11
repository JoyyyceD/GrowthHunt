/**
 * GET /api/scout/queue?ws=<workspaceId>[&from=ISO&to=ISO][&limit=N]
 * Publish queue — right rail, calendar (date-windowed) and activity views.
 */
import { NextRequest } from 'next/server'
import { listScheduledPosts } from '@/lib/postiz/store'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, 200)
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  let posts = await listScheduledPosts(auth.workspace.id, limit)
  if (from || to) {
    const fromMs = from ? Date.parse(from) : -Infinity
    const toMs = to ? Date.parse(to) : Infinity
    posts = posts.filter(p => {
      const when = p.scheduled_for || p.posted_at
      if (!when) return false
      const ms = Date.parse(when)
      return ms >= fromMs && ms <= toMs
    })
  }
  return Response.json({
    posts: posts.map(p => ({
      id: p.id,
      platform: p.platform,
      status: p.status,
      content: p.content,
      scheduled_for: p.scheduled_for,
      posted_at: p.posted_at,
      external_post_id: p.external_post_id,
      error: p.error,
    })),
  })
}

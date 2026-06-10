/**
 * /api/scout/share?ws=<workspaceId>
 *   GET  → current share state { slug, enabled, view_count } | null
 *   POST → { enabled } toggle (creates the report row on first enable)
 */
import { NextRequest } from 'next/server'
import { getReportForWorkspace, setReportEnabled } from '@/lib/scout/reports'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  return Response.json({ report: await getReportForWorkspace(auth.workspace.id) })
}

export async function POST(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  let body: { enabled?: boolean }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 })
  }
  const report = await setReportEnabled(auth.workspace.id, body.enabled !== false)
  if (!report) return Response.json({ error: 'share failed' }, { status: 500 })
  return Response.json({ report })
}

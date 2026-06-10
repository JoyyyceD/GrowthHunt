/** GET /api/scout/artifacts?ws=<workspaceId> — knowledge-base doc list. */
import { NextRequest } from 'next/server'
import { listArtifacts } from '@/lib/scout/artifacts'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  const artifacts = await listArtifacts(auth.workspace.id)
  return Response.json({ artifacts })
}

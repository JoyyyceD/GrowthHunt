/**
 * GET /api/scout/artifacts/[slug]?ws=<workspaceId>
 *   default        → { artifact, revisions }
 *   &download=1    → text/markdown attachment
 */
import { NextRequest } from 'next/server'
import { readArtifact, listRevisions } from '@/lib/scout/artifacts'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth

  const artifact = await readArtifact(auth.workspace.id, slug)
  if (!artifact) return Response.json({ error: 'not found' }, { status: 404 })

  if (req.nextUrl.searchParams.get('download')) {
    return new Response(artifact.content_md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.md"`,
      },
    })
  }
  const revisions = await listRevisions(auth.workspace.id, slug)
  return Response.json({
    artifact,
    revisions: revisions.map(r => ({ rev: r.rev, created_at: r.created_at })),
  })
}

/**
 * /api/scout/integrations?ws=<workspaceId>
 *   GET    → connection state per supported platform (+ X BYO key detection)
 *   DELETE → ?id=<connectionId> disconnect
 */
import { NextRequest } from 'next/server'
import { listConnections, deleteConnection, getConnectionById } from '@/lib/social/store'
import { getXKeysForWorkspace } from '@/lib/social/x-byo'
import { requireWorkspace } from '@/lib/scout/auth'

export const dynamic = 'force-dynamic'

const PLATFORMS = ['x', 'linkedin', 'reddit'] as const

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  const [connections, xByo] = await Promise.all([
    listConnections(auth.workspace.id),
    getXKeysForWorkspace(auth.workspace.id).catch(() => null),
  ])
  const platforms = PLATFORMS.map(platform => {
    const conn = connections.find(c => c.platform === platform)
    return {
      platform,
      connected: !!conn || (platform === 'x' && !!xByo),
      connection_id: conn?.id ?? null,
      handle: conn?.account_handle ?? (platform === 'x' && xByo ? 'BYO API keys' : null),
      needs_reconnect: conn?.needs_reconnect ?? false,
    }
  })
  return Response.json({ platforms })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireWorkspace(req.nextUrl.searchParams.get('ws'))
  if (auth instanceof Response) return auth
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })
  const conn = await getConnectionById(id)
  if (!conn || conn.workspace_id !== auth.workspace.id) {
    return Response.json({ error: 'connection not found' }, { status: 404 })
  }
  await deleteConnection(id)
  return Response.json({ ok: true })
}

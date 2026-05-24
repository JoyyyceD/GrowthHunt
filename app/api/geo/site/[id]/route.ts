/**
 * GET /api/geo/site/[id]
 *
 * Returns the current state of a site audit row (status + pages so far).
 * Used by the client to poll progress while the audit runs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSiteAudit } from '@/lib/geo/site-audit'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || id.length > 64) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const row = await getSiteAudit(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ row })
}

import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl } from '@/lib/audit'
import { getCachedAudit } from '@/lib/geo/cache'
import { createShare } from '@/lib/geo/shares'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const raw = (body.url || '').trim()
  if (!raw) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let normalized: string
  try {
    normalized = normalizeUrl(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  // Snapshot the cached audit — never trust a client-supplied result body.
  const result = await getCachedAudit(normalized)
  if (!result) {
    return NextResponse.json({ error: 'expired' }, { status: 404 })
  }

  const hash = await createShare(normalized, result)
  if (!hash) {
    return NextResponse.json({ error: 'Could not create a share link' }, { status: 500 })
  }

  return NextResponse.json({ hash })
}

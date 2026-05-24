/**
 * POST /api/geo/track
 *
 * Body: { url: string, email: string }
 *
 * Subscribes (email, url) to weekly re-audit + diff alerts. Idempotent —
 * re-tracking just resets next_run_at.
 */
import { NextRequest, NextResponse } from 'next/server'
import { normalizeUrl } from '@/lib/audit'
import { trackUrl } from '@/lib/geo/tracked'
import { saveSubscriber } from '@/lib/geo/subscribers'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { url?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = (body.url || '').trim()
  const email = (body.email || '').trim().toLowerCase()

  if (!rawUrl) return NextResponse.json({ error: 'Please enter a URL' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })

  let normalized: string
  try {
    normalized = normalizeUrl(rawUrl)
  } catch {
    return NextResponse.json({ error: 'That does not look like a valid URL' }, { status: 400 })
  }

  const { created, id } = await trackUrl(normalized, email)
  if (!created) {
    return NextResponse.json({ error: 'Could not track this URL. Please try again.' }, { status: 500 })
  }

  void saveSubscriber(email, 'geo-track')

  return NextResponse.json({ ok: true, id, url: normalized })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Save / schedule / unschedule a day. Upserts on (session_id, day_number).
 *
 *  Body fields (all optional except session_id, day_number, archetype):
 *    content_text  string       — set draft text
 *    scheduled_at  ISO | null   — schedule for cron / cancel schedule (pass null)
 */
export async function PATCH(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: {
    session_id?: string
    day_number?: number
    archetype?: string
    content_text?: string | null
    scheduled_at?: string | null
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const sessionId = String(body.session_id || '')
  const dayNumber = Number(body.day_number)
  const archetype = String(body.archetype || '').trim()
  if (!sessionId || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 14 || !archetype) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const update: Record<string, unknown> = { session_id: sessionId, day_number: dayNumber, archetype }

  if ('content_text' in body) {
    const text = (body.content_text ?? '').toString().trim()
    if (text.length > 280) return NextResponse.json({ error: 'over 280 chars' }, { status: 400 })
    update.content_text = text || null
  }

  if ('scheduled_at' in body) {
    if (body.scheduled_at === null || body.scheduled_at === '') {
      update.scheduled_at = null
      // resetting schedule also resets failure state so cron can retry cleanly later
      update.failed_at = null
      update.failure_reason = null
      update.retry_count = 0
    } else {
      const parsed = new Date(String(body.scheduled_at))
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'invalid scheduled_at' }, { status: 400 })
      }
      if (parsed.getTime() < Date.now() - 60_000) {
        return NextResponse.json({ error: 'scheduled_at must be in the future' }, { status: 400 })
      }
      update.scheduled_at = parsed.toISOString()
      update.failed_at = null
      update.failure_reason = null
      update.retry_count = 0
    }
  }

  const { data: row, error } = await sb
    .from('viralx_calendar_days')
    .upsert(update, { onConflict: 'session_id,day_number' })
    .select('id, content_text, scheduled_at, posted_at, x_post_id, failed_at, failure_reason')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, day: row })
}

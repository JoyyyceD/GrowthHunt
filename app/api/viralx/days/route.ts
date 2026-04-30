import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Manual save of edited day content (no LLM call). Used after the user
 *  customizes a generated draft. Upserts on (session_id, day_number). */
export async function PATCH(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { session_id?: string; day_number?: number; archetype?: string; content_text?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const sessionId = String(body.session_id || '')
  const dayNumber = Number(body.day_number)
  const archetype = String(body.archetype || '').trim()
  const text = String(body.content_text || '').trim()
  if (!sessionId || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 14 || !archetype) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  if (text.length > 280) return NextResponse.json({ error: 'over 280 chars' }, { status: 400 })

  const { data: row, error } = await sb
    .from('viralx_calendar_days')
    .upsert(
      { session_id: sessionId, day_number: dayNumber, archetype, content_text: text || null },
      { onConflict: 'session_id,day_number' }
    )
    .select('id, content_text')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, day_id: row?.id, content_text: row?.content_text })
}

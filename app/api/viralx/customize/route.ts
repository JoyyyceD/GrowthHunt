import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { classifyBlurb } from '@/lib/viralx/classify'
import { fetchExemplars } from '@/lib/viralx/exemplars'
import { minimaxChat } from '@/lib/viralx/minimax'
import { DEFAULT_PLAN } from '@/app/viralx/calendar'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { session_id?: string; day_number?: number; archetype?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const sessionId = String(body.session_id || '')
  const dayNumber = Number(body.day_number)
  const archetypeOverride = body.archetype ? String(body.archetype) : ''
  if (!sessionId || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 14) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  // RLS scopes to current user's session — no extra ownership check needed
  const { data: session } = await sb
    .from('viralx_sessions')
    .select('id, handle, startup_blurb')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  const dayPlan = DEFAULT_PLAN.find(d => d.day === dayNumber)
  if (!dayPlan) return NextResponse.json({ error: 'invalid day' }, { status: 400 })
  const archetype = archetypeOverride || dayPlan.archetype

  const category = classifyBlurb(session.startup_blurb)
  const exemplars = await fetchExemplars(sb, { category, archetype })

  const exemplarBlock = exemplars.map((e, i) =>
    `Example ${i + 1} (@${e.handle} — ${e.like_count.toLocaleString()} likes):\n${e.text}`
  ).join('\n\n') || '(no exemplars available — invent something archetype-appropriate)'

  const systemMsg =
    `You are a tweet copywriter for early-stage AI startup founders with no marketing background. ` +
    `Write a single Twitter post (max 280 chars, plain text, no markdown) in the founder's voice, ` +
    `matching the archetype "${archetype}". Today is "${dayPlan.title}" — ${dayPlan.hint}\n\n` +
    `Below are real high-engagement tweets from comparable AI startups${category ? ` in the ${category} space` : ''}. ` +
    `Study their hooks, structure, specificity, and tone — but DO NOT copy them:\n\n${exemplarBlock}`

  const userMsg =
    `My X handle is @${session.handle} and I'm building: ${session.startup_blurb}\n\n` +
    `Today is day ${dayNumber} of my launch — write the tweet matching the "${archetype}" archetype. ` +
    `Keep it under 280 characters. Output ONLY the tweet text — no quotes, no commentary, no explanation.`

  let generated: string
  try {
    generated = await minimaxChat({
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
      maxTokens: 400,
      temperature: 0.85,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'minimax failed' },
      { status: 502 }
    )
  }

  // Strip stray quotes the model sometimes wraps responses in
  const cleaned = generated.replace(/^["']|["']$/g, '').trim().slice(0, 280)

  const { data: row, error: upErr } = await sb
    .from('viralx_calendar_days')
    .upsert(
      {
        session_id: sessionId,
        day_number: dayNumber,
        archetype,
        content_text: cleaned,
        exemplar_ids: exemplars.map(e => e.id),
      },
      { onConflict: 'session_id,day_number' }
    )
    .select('id, content_text')
    .single()

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, text: cleaned, day_id: row?.id })
}

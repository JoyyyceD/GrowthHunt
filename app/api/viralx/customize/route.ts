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
    `Write ONE single Twitter post in the founder's voice, matching the archetype "${archetype}". ` +
    `Today is "${dayPlan.title}" — ${dayPlan.hint}\n\n` +
    `HARD CONSTRAINTS — non-negotiable:\n` +
    `- Total output MUST be ≤ 240 characters. Count as you write. Twitter caps at 280, so 240 is your safe budget.\n` +
    `- Plain text only. No markdown, no asterisks, no quote marks wrapping the tweet, no labels like "Tweet:".\n` +
    `- One single tweet. Not a thread, not a list, not multiple drafts.\n` +
    `- Output ONLY the tweet body. No commentary, no explanation, no preamble.\n\n` +
    `Below are real high-engagement tweets from comparable AI startups${category ? ` in the ${category} space` : ''}. ` +
    `Study their hooks, structure, specificity, and tone — but DO NOT copy them:\n\n${exemplarBlock}`

  const userMsg =
    `My X handle is @${session.handle} and I'm building: ${session.startup_blurb}\n\n` +
    `Day ${dayNumber} of my launch — give me ONE tweet matching the "${archetype}" archetype, ≤ 240 characters.`

  async function callOnce(extraInstruction?: string): Promise<string> {
    const messages = [
      { role: 'system' as const, content: systemMsg },
      { role: 'user' as const, content: userMsg },
    ]
    if (extraInstruction) {
      messages.push({ role: 'user' as const, content: extraInstruction })
    }
    return await minimaxChat({ messages, maxTokens: 400, temperature: 0.85 })
  }

  // Strip stray quotes/labels the model sometimes adds
  function cleanText(s: string): string {
    return s
      .trim()
      .replace(/^(?:tweet|post|draft)\s*[:\-–]\s*/i, '')   // "Tweet: ..."
      .replace(/^["'""''「」`]+|["'""''「」`]+$/g, '')        // wrapping quotes
      .trim()
  }

  // Smart-truncate: prefer breaking at sentence end / newline / space within last 40 chars
  function smartTruncate(text: string, max = 280): string {
    if (text.length <= max) return text
    const cut = text.slice(0, max)
    const tail = cut.slice(-40)
    const offset = cut.length - tail.length
    const sentenceEnd = Math.max(
      tail.lastIndexOf('.'), tail.lastIndexOf('!'), tail.lastIndexOf('?'),
      tail.lastIndexOf('。'), tail.lastIndexOf('！'), tail.lastIndexOf('？'),
      tail.lastIndexOf('\n'),
    )
    if (sentenceEnd >= 0) return cut.slice(0, offset + sentenceEnd + 1).trim()
    const space = tail.lastIndexOf(' ')
    if (space > 10) return (cut.slice(0, offset + space).trim() + '…')
    return cut.trim()
  }

  let generated: string
  try {
    generated = await callOnce()
    let candidate = cleanText(generated)
    // If model overshot, retry once with explicit feedback before resorting to truncation
    if (candidate.length > 280) {
      const retry = await callOnce(
        `Your previous draft was ${candidate.length} characters — too long. ` +
        `Rewrite the SAME tweet at ≤ 240 characters. Keep the hook, cut everything inessential. Output the tweet only.`
      )
      const retryCleaned = cleanText(retry)
      if (retryCleaned.length < candidate.length) candidate = retryCleaned
    }
    generated = smartTruncate(candidate, 280)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'minimax failed' },
      { status: 502 }
    )
  }

  const cleaned = generated

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

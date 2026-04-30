/**
 * Cron: publish scheduled ViralX day cards to X via the user's BYO OAuth 1.0a keys.
 *
 * Schedule: every 5 minutes (configured in vercel.json).
 * Auth: Bearer <CRON_SECRET> — same pattern as the xhunter ingest cron.
 *
 * Strategy:
 *   1. Use service_role admin client (RLS would block — cron has no auth.uid()).
 *   2. Pull viralx_calendar_days where:
 *        scheduled_at IS NOT NULL  AND  scheduled_at <= now()
 *        posted_at IS NULL
 *        retry_count < MAX_RETRIES
 *   3. For each row: load the session's owner -> their viralx_x_credentials.
 *   4. Sign POST /2/tweets with OAuth 1.0a, post the content_text.
 *   5. On success: write posted_at + x_post_id.
 *   6. On failure: write failed_at + failure_reason + retry_count++. Cron picks
 *      it up next tick until retry_count hits MAX_RETRIES.
 *
 * Notes:
 *   - X bills the user's pay-per-use balance (not ours) since we sign with
 *     the user's keys. That's the whole point of BYO mode.
 *   - We process MAX_PER_RUN per invocation to stay within Vercel maxDuration.
 *   - Errors are surfaced back to the user via failure_reason on the row.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { postTweet, type OAuth1Keys } from '@/lib/viralx/x-publish'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_PER_RUN = 30
const MAX_RETRIES = 3
const GAP_MS = 800

interface DueRow {
  id: string
  session_id: string
  day_number: number
  content_text: string | null
  retry_count: number
}

interface SessionOwner {
  id: string
  user_id: string
}

interface CredsRow {
  consumer_key: string | null
  consumer_secret: string | null
  access_token: string | null
  access_token_secret: string | null
}

export async function GET(req: NextRequest) {
  // ── auth ────────────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sb = createAdminClient()

  // ── pull due rows ───────────────────────────────────────────────────────
  const nowIso = new Date().toISOString()
  const { data: due, error: dueErr } = await sb
    .from('viralx_calendar_days')
    .select('id, session_id, day_number, content_text, retry_count')
    .lte('scheduled_at', nowIso)
    .is('posted_at', null)
    .lt('retry_count', MAX_RETRIES)
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })
    .limit(MAX_PER_RUN)
    .returns<DueRow[]>()

  if (dueErr) {
    return NextResponse.json({ error: dueErr.message }, { status: 500 })
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ checked: 0, published: 0 })
  }

  // ── group due rows by session, then resolve owners + credentials in 2 batched queries
  const sessionIds = [...new Set(due.map(r => r.session_id))]
  const { data: sessions } = await sb
    .from('viralx_sessions')
    .select('id, user_id')
    .in('id', sessionIds)
    .returns<SessionOwner[]>()
  const userBySession = new Map((sessions ?? []).map(s => [s.id, s.user_id]))

  const userIds = [...new Set((sessions ?? []).map(s => s.user_id))]
  const { data: creds } = userIds.length > 0
    ? await sb
        .from('viralx_x_credentials')
        .select('user_id, consumer_key, consumer_secret, access_token, access_token_secret')
        .in('user_id', userIds)
        .returns<(CredsRow & { user_id: string })[]>()
    : { data: [] as (CredsRow & { user_id: string })[] }
  const credsByUser = new Map((creds ?? []).map(c => [c.user_id, c]))

  // ── publish loop ────────────────────────────────────────────────────────
  let published = 0
  const failures: Array<{ day_id: string; reason: string }> = []

  for (const row of due) {
    try {
      if (!row.content_text || !row.content_text.trim()) {
        await markFailed(sb, row, 'no draft text')
        failures.push({ day_id: row.id, reason: 'no draft text' })
        continue
      }
      const userId = userBySession.get(row.session_id)
      if (!userId) {
        await markFailed(sb, row, 'session owner missing')
        failures.push({ day_id: row.id, reason: 'session owner missing' })
        continue
      }
      const c = credsByUser.get(userId)
      if (!c?.consumer_key || !c.consumer_secret || !c.access_token || !c.access_token_secret) {
        await markFailed(sb, row, 'no X credentials saved')
        failures.push({ day_id: row.id, reason: 'no X credentials saved' })
        continue
      }

      const keys: OAuth1Keys = {
        consumer_key: c.consumer_key,
        consumer_secret: c.consumer_secret,
        access_token: c.access_token,
        access_token_secret: c.access_token_secret,
      }
      const posted = await postTweet(row.content_text, keys)

      await sb
        .from('viralx_calendar_days')
        .update({
          posted_at: new Date().toISOString(),
          x_post_id: posted.id,
          failed_at: null,
          failure_reason: null,
        })
        .eq('id', row.id)
      published++
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      await markFailed(sb, row, reason.slice(0, 500))
      failures.push({ day_id: row.id, reason })
    }
    if (GAP_MS > 0) await new Promise(r => setTimeout(r, GAP_MS))
  }

  return NextResponse.json({
    checked: due.length,
    published,
    failures: failures.slice(0, 20),
  })
}

async function markFailed(
  sb: ReturnType<typeof createAdminClient>,
  row: DueRow,
  reason: string,
): Promise<void> {
  await sb
    .from('viralx_calendar_days')
    .update({
      failed_at: new Date().toISOString(),
      failure_reason: reason,
      retry_count: row.retry_count + 1,
    })
    .eq('id', row.id)
}

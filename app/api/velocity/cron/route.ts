/**
 * Cron: refresh the Velocity tracker. Runs weekly (see vercel.json).
 *
 *  1. Fetch breakout GitHub repos (created in the last 90 days) and upsert
 *     them, rotating each repo's previous star count into stars_prev so the
 *     page can show a true week-over-week delta.
 *  2. Snapshot follower counts for every tracked AI-founder X handle from the
 *     latest xhunter data, rotating the previous snapshot into followers_prev.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Can also be triggered manually with the same header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchBreakoutRepos } from '@/lib/velocity/github'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sb = createAdminClient()
  const now = new Date().toISOString()
  const result: { github: Record<string, unknown>; x: Record<string, unknown> } = {
    github: {},
    x: {},
  }

  // ── 1. GitHub repos ──
  try {
    const repos = await fetchBreakoutRepos()
    const { data: existing } = await sb
      .from('velocity_github_repos')
      .select('id, stars, synced_at')
    const prev = new Map((existing ?? []).map(r => [r.id as string, r]))

    const rows = repos.map(r => {
      const p = prev.get(r.id)
      return {
        ...r,
        stars_prev: p ? (p.stars as number) : null,
        prev_synced_at: p ? (p.synced_at as string) : null,
        synced_at: now,
      }
    })

    const { error } = await sb
      .from('velocity_github_repos')
      .upsert(rows, { onConflict: 'id' })
    if (error) result.github.error = error.message
    else result.github = { upserted: rows.length, ai: rows.filter(r => r.is_ai).length }
  } catch (e) {
    result.github.error = e instanceof Error ? e.message : String(e)
  }

  // ── 2. X follower snapshot ──
  try {
    const [{ data: source }, { data: existing }] = await Promise.all([
      sb.from('velocity_x_source_v').select('*'),
      sb.from('velocity_x_accounts').select('handle, followers, synced_at'),
    ])
    const prev = new Map((existing ?? []).map(r => [r.handle as string, r]))

    const rows = (source ?? []).map(s => {
      const p = prev.get(s.handle as string)
      return {
        handle: s.handle as string,
        display_name: (s.display_name as string | null) ?? null,
        avatar: (s.avatar as string | null) ?? null,
        company: (s.company as string | null) ?? null,
        category: (s.category as string | null) ?? null,
        account_type: (s.account_type as string | null) ?? null,
        display_label: (s.display_label as string | null) ?? null,
        is_blue_verified: (s.is_blue_verified as boolean) ?? false,
        followers: (s.followers as number) ?? 0,
        followers_prev: p ? (p.followers as number) : null,
        prev_synced_at: p ? (p.synced_at as string) : null,
        synced_at: now,
      }
    })

    if (rows.length > 0) {
      const { error } = await sb
        .from('velocity_x_accounts')
        .upsert(rows, { onConflict: 'handle' })
      if (error) result.x.error = error.message
      else result.x = { upserted: rows.length }
    } else {
      result.x.error = 'no source rows'
    }
  } catch (e) {
    result.x.error = e instanceof Error ? e.message : String(e)
  }

  // Push the fresh data to the ISR-cached /velocity page right away.
  revalidatePath('/velocity')

  return NextResponse.json({ ok: true, at: now, ...result })
}

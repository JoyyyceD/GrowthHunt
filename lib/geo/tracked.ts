/**
 * geo_tracked_urls — weekly monitor subscriptions.
 *
 * One row per (url, email). The cron picks rows where next_run_at <= now()
 * and paused = false, runs a fresh audit, compares against the last snapshot,
 * emails a diff if the score moved meaningfully, and bumps next_run_at +7d.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'node:crypto'
import { normalizeUrl } from '@/lib/audit'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function urlHash(url: string): string {
  return createHash('sha256').update(normalizeUrl(url)).digest('hex').slice(0, 32)
}

export interface TrackedUrl {
  id: string
  url: string
  url_hash: string
  email: string
  last_score: number | null
  last_run_at: string | null
  next_run_at: string
  paused: boolean
  created_at: string
}

export async function trackUrl(url: string, email: string): Promise<{ created: boolean; id?: string }> {
  const admin = createAdminClient()
  const normalized = normalizeUrl(url)
  const hash = urlHash(normalized)
  const lower = email.trim().toLowerCase()
  const { data, error } = await admin
    .from('geo_tracked_urls')
    .upsert(
      {
        url: normalized,
        url_hash: hash,
        email: lower,
        next_run_at: new Date(Date.now() + WEEK_MS).toISOString(),
        paused: false,
      },
      { onConflict: 'url_hash,email', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (error) {
    console.error('[geo] trackUrl failed:', error.message)
    return { created: false }
  }
  return { created: true, id: data?.id as string }
}

export async function listDue(now: Date = new Date(), limit = 20): Promise<TrackedUrl[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('geo_tracked_urls')
    .select('*')
    .lte('next_run_at', now.toISOString())
    .eq('paused', false)
    .order('next_run_at', { ascending: true })
    .limit(limit)
  if (error) {
    console.error('[geo] listDue failed:', error.message)
    return []
  }
  return (data || []) as TrackedUrl[]
}

export async function markRun(id: string, score: number): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('geo_tracked_urls')
    .update({
      last_score: score,
      last_run_at: new Date().toISOString(),
      next_run_at: new Date(Date.now() + WEEK_MS).toISOString(),
    })
    .eq('id', id)
}

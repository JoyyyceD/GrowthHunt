/**
 * Per-day usage limiting (geo_usage).
 *
 * Anonymous visitors get ANON_DAILY_LIMIT new audits per day, keyed by a
 * rotating IP hash. Degrades open: if the counter store is unavailable the
 * request is allowed rather than blocked.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export const ANON_DAILY_LIMIT = 3
export const EMAIL_DAILY_LIMIT = 10

export interface UsageResult {
  allowed: boolean
  used: number
  limit: number
}

/** Atomically increment the day's counter for `key` and check it against `limit`. */
export async function checkUsage(key: string, limit: number = ANON_DAILY_LIMIT): Promise<UsageResult> {
  const day = new Date().toISOString().slice(0, 10)
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('geo_increment_usage', { p_key: key, p_day: day })
    if (error || typeof data !== 'number') {
      return { allowed: true, used: 0, limit }
    }
    return { allowed: data <= limit, used: data, limit }
  } catch (err) {
    console.error('[geo] usage check failed:', (err as Error).message)
    return { allowed: true, used: 0, limit }
  }
}

/**
 * 24h audit cache (geo_audits).
 *
 * Every helper degrades gracefully: if Supabase is unreachable or the table
 * doesn't exist yet, audits still run — they just aren't cached.
 */
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeUrl } from '@/lib/audit'
import { RUBRIC_VERSION } from '@/lib/audit/types'
import type { AuditResult } from '@/lib/audit'

const TTL_MS = 24 * 60 * 60 * 1000

export function urlHash(url: string): string {
  return createHash('sha256').update(normalizeUrl(url)).digest('hex').slice(0, 32)
}

/** Return a fresh cached audit, or null on miss / stale / rubric change. */
export async function getCachedAudit(url: string): Promise<AuditResult | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('geo_audits')
      .select('result, expires_at, rubric_version')
      .eq('url_hash', urlHash(url))
      .maybeSingle()
    if (!data) return null
    if (new Date(data.expires_at as string).getTime() < Date.now()) return null
    if (data.rubric_version !== RUBRIC_VERSION) return null
    return data.result as AuditResult
  } catch (err) {
    console.error('[geo] cache read failed:', (err as Error).message)
    return null
  }
}

export async function saveAudit(url: string, result: AuditResult): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('geo_audits').upsert({
      url_hash: urlHash(url),
      url: normalizeUrl(url),
      overall_score: result.overall_score,
      rubric_version: result.rubric_version,
      result,
      fetched_at: result.fetched_at,
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    })
  } catch (err) {
    console.error('[geo] cache write failed:', (err as Error).message)
  }
}

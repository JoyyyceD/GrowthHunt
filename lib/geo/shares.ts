/** Public share-page snapshots (geo_shares). */
import { randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AuditResult } from '@/lib/audit'

export interface ShareSnapshot {
  url: string
  result: AuditResult
  created_at: string
}

/** Snapshot an audit result behind a short hash. Returns the hash, or null. */
export async function createShare(url: string, result: AuditResult): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const hash = randomBytes(6).toString('base64url') // ~8 url-safe chars
    const { error } = await admin.from('geo_shares').insert({ hash, url, result })
    if (error) {
      console.error('[geo] share create failed:', error.message)
      return null
    }
    return hash
  } catch (err) {
    console.error('[geo] share create failed:', (err as Error).message)
    return null
  }
}

export async function getShare(hash: string): Promise<ShareSnapshot | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('geo_shares')
      .select('url, result, created_at')
      .eq('hash', hash)
      .maybeSingle()
    if (!data) return null
    return {
      url: data.url as string,
      result: data.result as AuditResult,
      created_at: data.created_at as string,
    }
  } catch (err) {
    console.error('[geo] share read failed:', (err as Error).message)
    return null
  }
}

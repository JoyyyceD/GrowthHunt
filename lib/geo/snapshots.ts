/**
 * geo_snapshots — historical score samples per URL.
 *
 * The weekly cron writes one row per successful re-audit. The diff for the
 * email alert uses the most recent prior snapshot (older than the just-written
 * one) so we always compare like-for-like.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { AuditResult } from '@/lib/audit'

export interface Snapshot {
  id: string
  url_hash: string
  overall_score: number
  rubric_version: string
  dim_scores: Record<string, number>
  created_at: string
}

export async function saveSnapshot(urlHash: string, result: AuditResult): Promise<Snapshot | null> {
  const admin = createAdminClient()
  const dim_scores = Object.fromEntries(result.dimensions.map((d) => [d.id, d.percent]))
  const { data, error } = await admin
    .from('geo_snapshots')
    .insert({
      url_hash: urlHash,
      overall_score: result.overall_score,
      rubric_version: result.rubric_version,
      dim_scores,
    })
    .select('*')
    .single()
  if (error) {
    console.error('[geo] saveSnapshot failed:', error.message)
    return null
  }
  return data as Snapshot
}

export async function getPreviousSnapshot(urlHash: string, excludeId?: string): Promise<Snapshot | null> {
  const admin = createAdminClient()
  let query = admin
    .from('geo_snapshots')
    .select('*')
    .eq('url_hash', urlHash)
    .order('created_at', { ascending: false })
    .limit(2)
  const { data, error } = await query
  if (error) {
    console.error('[geo] getPreviousSnapshot failed:', error.message)
    return null
  }
  const rows = (data || []) as Snapshot[]
  // skip the row we just inserted if excludeId was supplied
  const previous = excludeId ? rows.find((r) => r.id !== excludeId) : rows[1]
  return previous || null
}

export interface ScoreDiff {
  overallDelta: number
  /** [dim_id, prev, now, delta] sorted by |delta| desc */
  dimensionDeltas: Array<{ id: string; prev: number; now: number; delta: number }>
}

export function computeDiff(previous: Snapshot, current: Snapshot): ScoreDiff {
  const overallDelta = current.overall_score - previous.overall_score
  const allKeys = new Set<string>([
    ...Object.keys(previous.dim_scores || {}),
    ...Object.keys(current.dim_scores || {}),
  ])
  const dimensionDeltas: ScoreDiff['dimensionDeltas'] = []
  for (const id of allKeys) {
    const prev = previous.dim_scores?.[id] ?? 0
    const now = current.dim_scores?.[id] ?? 0
    dimensionDeltas.push({ id, prev, now, delta: now - prev })
  }
  dimensionDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return { overallDelta, dimensionDeltas }
}

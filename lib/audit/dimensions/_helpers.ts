/** Shared builders for dimension results. */
import type { Check, CheckStatus, DimensionResult } from '../types'

interface CheckOpts {
  /** override the status-derived score */
  score?: number
  /** what was actually found on the page */
  detail?: string
  /** static, one-line remediation hint */
  fix?: string
}

/**
 * Build a Check. Score defaults from status:
 * pass = max, partial = half, fail/na = 0.
 * `na` checks are excluded from the dimension total by buildDimension.
 */
export function mkCheck(
  id: string,
  label: string,
  max: number,
  status: CheckStatus,
  opts: CheckOpts = {},
): Check {
  const score = opts.score ?? (
    status === 'pass' ? max
    : status === 'partial' ? Math.round(max / 2)
    : 0
  )
  return { id, label, status, score, max, detail: opts.detail, fix: opts.fix }
}

interface DimMeta {
  id: string
  label: string
  weight: number
  version: string
}

/** Aggregate checks into a DimensionResult. `na` checks don't count. */
export function buildDimension(meta: DimMeta, checks: Check[]): DimensionResult {
  const scored = checks.filter((c) => c.status !== 'na')
  const max = scored.reduce((s, c) => s + c.max, 0)
  const score = scored.reduce((s, c) => s + c.score, 0)
  const percent = max > 0 ? Math.round((score / max) * 100) : 100
  const weighted = Math.round((percent * meta.weight) / 100 * 10) / 10
  return {
    id: meta.id,
    label: meta.label,
    weight: meta.weight,
    score,
    max,
    percent,
    weighted,
    checks,
    version: meta.version,
  }
}

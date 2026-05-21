/** Deterministic issue list — built from failed checks, used as the
 *  baseline before (and the fallback after) LLM synthesis. */
import type { DimensionResult, GatingFlag, Issue, Severity } from './types'

const GATING_FIX: Record<string, string> = {
  'ai-bots-blocked': 'Edit robots.txt to allow OAI-SearchBot, PerplexityBot and ClaudeBot.',
  'noindex': 'Remove the noindex directive (meta tag or X-Robots-Tag header) from this page.',
  'not-analyzable': 'Serve real HTML content (SSR/SSG) so crawlers and this audit can read the page.',
}

const RANK: Record<Severity, number> = { critical: 3, high: 2, medium: 1, low: 0 }

function severityFor(status: string, weight: number): Severity {
  if (status === 'fail') return weight >= 12 ? 'high' : 'medium'
  return weight >= 13 ? 'medium' : 'low'
}

export function buildDeterministicIssues(
  dimensions: DimensionResult[],
  gating: GatingFlag[],
): Issue[] {
  const issues: Issue[] = []

  for (const flag of gating) {
    if (!flag.triggered) continue
    issues.push({
      severity: 'critical',
      dimension: 'gating',
      title: flag.label,
      explanation: flag.detail || flag.label,
      fix_suggestion: GATING_FIX[flag.id] || 'Resolve this blocking issue.',
    })
  }

  for (const dim of dimensions) {
    for (const check of dim.checks) {
      if (check.status === 'pass' || check.status === 'na') continue
      issues.push({
        severity: severityFor(check.status, dim.weight),
        dimension: dim.id,
        title: check.label,
        explanation: check.detail || check.label,
        fix_suggestion: check.fix || `Improve: ${check.label}`,
      })
    }
  }

  return issues.sort((a, b) => RANK[b.severity] - RANK[a.severity])
}

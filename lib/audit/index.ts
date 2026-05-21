/**
 * GEO audit engine — orchestration.
 *
 * fetch → parse → run every dimension → apply gating → synthesize issues →
 * assemble an AuditResult. The result is plain JSON (cacheable in Supabase).
 */
import { fetchAndParse } from './fetch'
import { DIMENSIONS } from './registry'
import { evaluateGating } from './gating'
import { buildDeterministicIssues } from './issues'
import { synthesizeIssues } from './llm'
import { RUBRIC_VERSION } from './types'
import type {
  AuditResult, AuditStatus, DimensionResult, EngineCompatibility,
  EngineRating, Grade,
} from './types'

function gradeFor(score: number): Grade {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

/** A specific AI crawler's robots.txt check failed inside crawler-access. */
function botBlocked(dims: DimensionResult[], checkId: string): boolean {
  const crawler = dims.find((d) => d.id === 'crawler-access')
  return crawler?.checks.find((c) => c.id === checkId)?.status === 'fail'
}

function rate(score: number, blocked: boolean): EngineRating {
  if (blocked) return 'low'
  if (score >= 70) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

function engineCompatibility(dims: DimensionResult[], score: number): EngineCompatibility {
  return {
    chatgpt: rate(score, botBlocked(dims, 'chatgpt-bot')),
    perplexity: rate(score, botBlocked(dims, 'perplexity-bot')),
    gemini: rate(score, botBlocked(dims, 'gemini-bot')),
    claude: rate(score, botBlocked(dims, 'claude-bot')),
  }
}

function errorResult(url: string, message: string): AuditResult {
  return {
    url,
    status: 'error',
    notice: message,
    overall_score: 0,
    grade: 'F',
    rubric_version: RUBRIC_VERSION,
    fetched_at: new Date().toISOString(),
    dimensions: [],
    issues: [{
      severity: 'critical',
      dimension: 'fetch',
      title: 'Page could not be fetched',
      explanation: message,
      fix_suggestion: 'Make sure the URL is public, returns HTML, and is reachable without JavaScript.',
    }],
    engine_compatibility: { chatgpt: 'low', perplexity: 'low', gemini: 'low', claude: 'low' },
    gating: [],
  }
}

export async function runAudit(inputUrl: string): Promise<AuditResult> {
  let ctx
  try {
    ctx = await fetchAndParse(inputUrl)
  } catch (err) {
    return errorResult(inputUrl, (err as Error).message || 'Fetch failed')
  }

  const dimensions = await Promise.all(DIMENSIONS.map((d) => d.run(ctx)))
  const gating = evaluateGating(ctx)

  const rawScore = dimensions.reduce((sum, d) => sum + d.weighted, 0)
  const caps = gating.filter((g) => g.triggered).map((g) => g.cap)
  const overall = Math.round(Math.min(rawScore, ...caps, 100))

  let status: AuditStatus = 'ok'
  let notice: string | undefined
  if (ctx.status >= 400) {
    status = 'error'
    notice = `The page returned HTTP ${ctx.status}.`
  } else if (ctx.isSPA) {
    status = 'limited'
    notice = 'This page renders its content with JavaScript. Only the HTML shell '
      + 'could be analyzed — AI crawlers that do not run JS see the same limited page.'
  }

  const deterministic = buildDeterministicIssues(dimensions, gating)
  const issues = await synthesizeIssues(deterministic, ctx)

  return {
    url: ctx.url,
    status,
    notice,
    overall_score: overall,
    grade: gradeFor(overall),
    rubric_version: RUBRIC_VERSION,
    fetched_at: new Date().toISOString(),
    dimensions,
    issues,
    engine_compatibility: engineCompatibility(dimensions, overall),
    gating,
  }
}

export type { AuditResult } from './types'
export { normalizeUrl } from './fetch'

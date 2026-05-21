/**
 * GrowthHunt GEO — audit engine type contracts.
 *
 * RUBRIC_VERSION is stamped onto every AuditResult. Bump it whenever a
 * dimension's weight, checks, or scoring logic changes, so the Phase 2
 * monitoring agent can tell a real score change from a rubric change.
 */
import type { CheerioAPI } from 'cheerio'

export const RUBRIC_VERSION = '1.0.0'

// ── Checks & dimensions ──

export type CheckStatus = 'pass' | 'fail' | 'partial' | 'na'

/** One granular pass/fail test inside a dimension. */
export interface Check {
  id: string
  label: string
  status: CheckStatus
  /** points earned, 0..max */
  score: number
  /** points this check can contribute */
  max: number
  /** what was actually found on the page */
  detail?: string
  /** static, one-line remediation hint */
  fix?: string
}

/** Output of running one dimension. */
export interface DimensionResult {
  id: string
  label: string
  /** share of the 100-point total */
  weight: number
  /** raw points earned across checks */
  score: number
  /** raw points available across checks */
  max: number
  /** score/max normalized to 0..100 */
  percent: number
  /** contribution to overall_score: percent * weight / 100 */
  weighted: number
  checks: Check[]
  version: string
}

/** A pluggable dimension module. Registered in registry.ts. */
export interface Dimension {
  id: string
  label: string
  weight: number
  version: string
  run(ctx: AuditContext): DimensionResult | Promise<DimensionResult>
}

// ── Issues ──

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface Issue {
  severity: Severity
  dimension: string
  title: string
  explanation: string
  fix_suggestion: string
  fix_code?: string
}

// ── Engine compatibility ──

export type EngineRating = 'high' | 'medium' | 'low'

export interface EngineCompatibility {
  chatgpt: EngineRating
  perplexity: EngineRating
  gemini: EngineRating
  claude: EngineRating
}

// ── Gating ──

/** A catastrophic flag that caps the overall score regardless of weighting. */
export interface GatingFlag {
  id: string
  label: string
  triggered: boolean
  /** when triggered, overall_score is capped at this value */
  cap: number
  detail?: string
}

// ── Audit result ──

export type AuditStatus = 'ok' | 'limited' | 'error'
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface AuditResult {
  url: string
  status: AuditStatus
  /** why, when status is limited or error */
  notice?: string
  /** 0..100 */
  overall_score: number
  grade: Grade
  rubric_version: string
  /** ISO timestamp */
  fetched_at: string
  dimensions: DimensionResult[]
  issues: Issue[]
  engine_compatibility: EngineCompatibility
  gating: GatingFlag[]
}

// ── Fetch context ──

/** A secondary resource fetched alongside the page (robots.txt etc.). */
export interface FetchedResource {
  found: boolean
  status: number
  text: string
}

/** Everything a dimension needs to score a page. Built by lib/audit/fetch.ts. */
export interface AuditContext {
  url: string
  normalizedUrl: string
  origin: string
  status: number
  headers: Record<string, string>
  html: string
  $: CheerioAPI
  /** visible text content, scripts/styles stripped */
  text: string
  wordCount: number
  /** true when the page ships an empty shell and renders via JS */
  isSPA: boolean
  robotsTxt: FetchedResource
  sitemapXml: FetchedResource
  llmsTxt: FetchedResource
}

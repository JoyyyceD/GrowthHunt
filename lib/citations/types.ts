/**
 * Citation-engine types.
 *
 * A "live citation check" asks N AI answer engines M queries each, then
 * looks for the target page's domain in each response's source list. The
 * result is a heatmap (queries × engines) plus per-engine + overall rates.
 */
export type EngineId = 'perplexity' | 'openai' | 'gemini' | 'claude'

export const ALL_ENGINES: EngineId[] = ['perplexity', 'openai', 'gemini', 'claude']

export interface EngineCitationResult {
  engine: EngineId
  query: string
  /** False when the engine's API key isn't configured; cell is "skipped". */
  available: boolean
  /** True if the engine's answer cited the target domain (or any URL on it). */
  cited: boolean
  /** Unique source URLs returned by the engine for this query (may be empty). */
  citedUrls: string[]
  /** Short snippet of the engine's answer (≤200 chars), for UI tooltips. */
  answerSnippet?: string
  /** Set when the call failed (HTTP, parsing, etc.); `cited` is then false. */
  error?: string
}

export interface CitationSummary {
  totalEngines: number
  availableEngines: number
  totalQueries: number
  citationsByEngine: Record<EngineId, { cited: number; total: number }>
  overallCitedCells: number
  overallTotalCells: number
  overallRate: number      // 0..1, citedCells / totalCells (excluding skipped engines)
}

export interface CitationRun {
  url: string
  domain: string
  brand: string
  queries: string[]
  results: EngineCitationResult[]
  summary: CitationSummary
  createdAt: string
}

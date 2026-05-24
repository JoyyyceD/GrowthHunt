/**
 * Live AI citation check — orchestration.
 *
 *   1. Fetch the page (cheap HTML pull) to extract title + meta + h1 + brand.
 *   2. Derive 4-8 natural-language queries.
 *   3. Hit every available engine (Perplexity / OpenAI / Gemini / Claude) per
 *      query, in parallel with a hard concurrency cap so we don't blow past
 *      provider RPS limits.
 *   4. Roll up to a per-engine + overall citation rate.
 *   5. Persist the run for sharing / history.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'node:crypto'
import { perplexityCite } from './perplexity'
import { openaiCite } from './openai'
import { geminiCite } from './gemini'
import { claudeCite } from './claude'
import { deriveQueries, canonicalDomain, DEFAULT_QUERY_COUNT } from './queries'
import { ALL_ENGINES } from './types'
import type {
  CitationRun, CitationSummary, EngineCitationResult, EngineId,
} from './types'

const FETCH_TIMEOUT_MS = 8_000
const ENGINE_CONCURRENCY = 4   // engines per query
const QUERY_CONCURRENCY = 3    // queries in flight

interface PageMeta {
  title: string
  description: string
  h1: string
  brand: string
}

async function pullPageMeta(url: string): Promise<PageMeta> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GrowthHuntGEO/1.0 (+https://growthhunt.ai/geo)' },
    })
    const html = (await res.text()).slice(0, 200_000)
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim()
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim()
    const ogSite = (html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim()
    const brand = ogSite || title.split(/[—|–:-]/)[0]?.trim() || canonicalDomain(url).split('.')[0]
    return { title, description, h1, brand }
  } catch {
    const brand = canonicalDomain(url).split('.')[0] || 'this site'
    return { title: '', description: '', h1: '', brand }
  } finally {
    clearTimeout(timer)
  }
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      out[idx] = await fn(items[idx]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

const ENGINE_RUNNERS: Record<EngineId, (q: string, d: string) => Promise<EngineCitationResult>> = {
  perplexity: perplexityCite,
  openai: openaiCite,
  gemini: geminiCite,
  claude: claudeCite,
}

function summarize(results: EngineCitationResult[]): CitationSummary {
  const byEngine = Object.fromEntries(
    ALL_ENGINES.map((e) => [e, { cited: 0, total: 0 }]),
  ) as Record<EngineId, { cited: number; total: number }>

  const availableSet = new Set<EngineId>()
  for (const r of results) {
    if (r.available) {
      availableSet.add(r.engine)
      byEngine[r.engine]!.total += 1
      if (r.cited) byEngine[r.engine]!.cited += 1
    }
  }

  const totalCells = ALL_ENGINES.reduce((sum, e) => sum + byEngine[e]!.total, 0)
  const citedCells = ALL_ENGINES.reduce((sum, e) => sum + byEngine[e]!.cited, 0)

  return {
    totalEngines: ALL_ENGINES.length,
    availableEngines: availableSet.size,
    totalQueries: new Set(results.map((r) => r.query)).size,
    citationsByEngine: byEngine,
    overallCitedCells: citedCells,
    overallTotalCells: totalCells,
    overallRate: totalCells === 0 ? 0 : citedCells / totalCells,
  }
}

export interface RunCitationsInput {
  url: string
  /** Override the auto-derived query set; if provided, no LLM call is made. */
  queries?: string[]
  queryCount?: number
  /** Subset of engines to call. Default: all configured. */
  engines?: EngineId[]
}

export async function runCitationCheck(input: RunCitationsInput): Promise<CitationRun> {
  const meta = await pullPageMeta(input.url)
  const domain = canonicalDomain(input.url)
  const engines = (input.engines && input.engines.length > 0) ? input.engines : ALL_ENGINES
  const queries = (input.queries && input.queries.length > 0)
    ? input.queries.slice(0, 10)
    : await deriveQueries({
        url: input.url,
        title: meta.title,
        description: meta.description,
        h1: meta.h1,
        brand: meta.brand,
      }, input.queryCount || DEFAULT_QUERY_COUNT)

  const allCells: EngineCitationResult[] = []
  await mapConcurrent(queries, QUERY_CONCURRENCY, async (q) => {
    const cells = await mapConcurrent(engines, ENGINE_CONCURRENCY, (e) => ENGINE_RUNNERS[e](q, domain))
    allCells.push(...cells)
  })

  const run: CitationRun = {
    url: input.url,
    domain,
    brand: meta.brand,
    queries,
    results: allCells,
    summary: summarize(allCells),
    createdAt: new Date().toISOString(),
  }

  void persistCitationRun(run).catch((err) => {
    console.error('[citations] persist failed:', (err as Error).message)
  })

  return run
}

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32)
}

async function persistCitationRun(run: CitationRun): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('geo_citation_runs').insert({
      url: run.url,
      url_hash: urlHash(run.url),
      brand: run.brand,
      domain: run.domain,
      queries: run.queries,
      results: run.results,
      summary: run.summary,
    })
  } catch (err) {
    console.error('[citations] insert failed:', (err as Error).message)
  }
}

export type { CitationRun, EngineCitationResult, CitationSummary, EngineId } from './types'

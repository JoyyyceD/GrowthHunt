/**
 * Site-wide audit orchestration.
 *
 * A site audit creates a geo_site_audits row in status=running, then runs
 * audits for up to ~30 URLs from the sitemap with bounded concurrency.
 * Per-URL results are streamed back into the row's `pages` jsonb so the
 * client poller can render a progress heatmap.
 *
 * NOTE: on Vercel serverless, a single function invocation can run up to
 * 300s with maxDuration. We run the loop in the request handler itself and
 * return when finished — clients see status=done. If invocation times out,
 * status stays 'running' until manually advanced; that's an acceptable
 * failure mode for a first cut.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { runAudit } from '@/lib/audit'
import { getCachedAudit, saveAudit } from '@/lib/geo/cache'
import { discoverSitemap } from './sitemap'

const URL_CONCURRENCY = 3
const PER_URL_TIMEOUT_MS = 25_000

export interface PageResult {
  url: string
  score: number | null
  dims: Record<string, number>
  status: 'ok' | 'limited' | 'error'
  error?: string
}

export interface SiteAuditRow {
  id: string
  domain: string
  sitemap_url: string
  status: 'running' | 'done' | 'error'
  total_urls: number
  audited_urls: number
  pages: PageResult[]
  created_at: string
  finished_at?: string | null
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const guard = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  try {
    return (await Promise.race([p, guard])) as T
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function auditOne(url: string): Promise<PageResult> {
  try {
    const cached = await getCachedAudit(url)
    if (cached) {
      return {
        url,
        score: cached.overall_score,
        dims: Object.fromEntries(cached.dimensions.map((d) => [d.id, d.percent])),
        status: cached.status,
      }
    }
    const result = await withTimeout(runAudit(url), PER_URL_TIMEOUT_MS, `audit ${url}`)
    if (result.status !== 'error') await saveAudit(url, result)
    return {
      url,
      score: result.status === 'error' ? null : result.overall_score,
      dims: Object.fromEntries(result.dimensions.map((d) => [d.id, d.percent])),
      status: result.status,
      error: result.status === 'error' ? result.notice : undefined,
    }
  } catch (err) {
    return { url, score: null, dims: {}, status: 'error', error: (err as Error).message }
  }
}

async function patchRow(id: string, patch: Record<string, unknown>): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('geo_site_audits').update(patch).eq('id', id)
  } catch (err) {
    console.error('[site-audit] patch failed:', (err as Error).message)
  }
}

/** Start a new site audit. Discovers the sitemap synchronously; returns the row. */
export async function startSiteAudit(domain: string): Promise<{ id: string; row: SiteAuditRow } | { error: string }> {
  const discovery = await discoverSitemap(domain)
  if (!discovery) {
    return { error: 'No sitemap.xml found at the domain. Make sure /sitemap.xml is publicly accessible.' }
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('geo_site_audits')
    .insert({
      domain,
      sitemap_url: discovery.sitemapUrl,
      total_urls: discovery.urls.length,
      audited_urls: 0,
      pages: [],
      status: 'running',
    })
    .select('*')
    .single()
  if (error || !data) {
    return { error: `Could not create site audit: ${error?.message || 'unknown'}` }
  }
  return { id: data.id as string, row: data as SiteAuditRow }
}

/** Run the queued audit for an existing site_audit row. Writes results incrementally. */
export async function runSiteAuditBody(id: string, urls: string[]): Promise<void> {
  const pages: PageResult[] = []
  let cursor = 0
  let next = 0

  async function worker() {
    while (true) {
      const i = next++
      if (i >= urls.length) return
      const result = await auditOne(urls[i]!)
      pages[i] = result
      cursor++
      // Stream progress every few completions to avoid spamming.
      if (cursor % 3 === 0 || cursor === urls.length) {
        await patchRow(id, {
          pages: pages.filter(Boolean),
          audited_urls: cursor,
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(URL_CONCURRENCY, urls.length) }, worker))

  await patchRow(id, {
    pages: pages.filter(Boolean),
    audited_urls: cursor,
    status: 'done',
    finished_at: new Date().toISOString(),
  })
}

export async function getSiteAudit(id: string): Promise<SiteAuditRow | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('geo_site_audits')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return data as SiteAuditRow
  } catch (err) {
    console.error('[site-audit] get failed:', (err as Error).message)
    return null
  }
}

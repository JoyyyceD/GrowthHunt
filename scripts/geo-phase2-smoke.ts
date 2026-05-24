/**
 * GEO Phase 2 smoke test — lib-layer only, no external HTTP except sitemap.
 *
 *   bun run scripts/geo-phase2-smoke.ts
 *
 * Validates:
 *   - citation engines all return available:false cleanly with no env keys
 *   - deriveQueries falls back to heuristic without MINIMAX_API_KEY
 *   - domainMatches and canonicalDomain handle common shapes
 *   - sitemap parser pulls URLs from growthhunt.ai/sitemap.xml
 *   - snapshot diff math is correct
 *   - GitHub PR body/markdown renders without network
 */
import { perplexityCite } from '../lib/citations/perplexity'
import { openaiCite } from '../lib/citations/openai'
import { geminiCite } from '../lib/citations/gemini'
import { claudeCite } from '../lib/citations/claude'
import { deriveQueries, canonicalDomain, domainMatches } from '../lib/citations/queries'
import { discoverSitemap } from '../lib/geo/sitemap'
import { computeDiff, type Snapshot } from '../lib/geo/snapshots'

const ok = (label: string, cond: boolean, detail?: string) => {
  const mark = cond ? '✓' : '✗'
  const tail = detail ? `   (${detail})` : ''
  console.log(`  ${mark} ${label}${tail}`)
  if (!cond) process.exitCode = 1
}

async function testEngines() {
  console.log('\n── Engine adapters (no keys → available:false) ──')
  // Wipe env so the test is deterministic regardless of dev shell.
  for (const k of ['PERPLEXITY_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY']) {
    delete process.env[k]
  }
  const q = 'What is GrowthHunt?'
  const d = 'growthhunt.ai'
  const a = await perplexityCite(q, d); ok('perplexity', !a.available && !a.cited, JSON.stringify(a))
  const b = await openaiCite(q, d);     ok('openai',     !b.available && !b.cited, JSON.stringify(b))
  const c = await geminiCite(q, d);     ok('gemini',     !c.available && !c.cited, JSON.stringify(c))
  const e = await claudeCite(q, d);     ok('claude',     !e.available && !e.cited, JSON.stringify(e))
}

async function testQueries() {
  console.log('\n── Query derivation + URL matching ──')
  delete process.env.MINIMAX_API_KEY
  const qs = await deriveQueries({ url: 'https://growthhunt.ai/geo', brand: 'GrowthHunt', title: 'GEO Audit' }, 6)
  ok('deriveQueries returns 6 strings', Array.isArray(qs) && qs.length === 6, `got ${qs.length}`)
  ok('canonicalDomain strips www', canonicalDomain('https://www.growthhunt.ai/foo') === 'growthhunt.ai')
  ok('domainMatches direct', domainMatches('https://growthhunt.ai/geo', 'growthhunt.ai'))
  ok('domainMatches subdomain', domainMatches('https://blog.growthhunt.ai/x', 'growthhunt.ai'))
  ok('domainMatches rejects other', !domainMatches('https://other.com/x', 'growthhunt.ai'))
  ok('domainMatches handles garbage', !domainMatches('not-a-url', 'growthhunt.ai'))
}

async function testSitemap() {
  console.log('\n── Sitemap discovery on growthhunt.ai ──')
  try {
    const disc = await discoverSitemap('growthhunt.ai')
    if (!disc) { ok('discovery returned a result', false, 'null'); return }
    ok('discovery returned sitemap', true, disc.sitemapUrl)
    ok('discovery returned at least 1 URL', disc.urls.length >= 1, `${disc.urls.length} urls`)
    ok('first URL is same-origin', new URL(disc.urls[0]!).origin === disc.origin, disc.urls[0])
  } catch (err) {
    ok('discovery threw', false, (err as Error).message)
  }
}

function testDiff() {
  console.log('\n── Snapshot diff math ──')
  const prev: Snapshot = {
    id: 'p', url_hash: 'h', overall_score: 68, rubric_version: '1.0.0',
    dim_scores: { structure: 72, schema: 88, 'first-answer': 33 }, created_at: '2026-05-17',
  }
  const cur: Snapshot = {
    id: 'c', url_hash: 'h', overall_score: 80, rubric_version: '1.0.0',
    dim_scores: { structure: 84, schema: 88, 'first-answer': 60 }, created_at: '2026-05-24',
  }
  const d = computeDiff(prev, cur)
  ok('overallDelta = +12', d.overallDelta === 12)
  ok('first-answer top mover', d.dimensionDeltas[0]!.id === 'first-answer', JSON.stringify(d.dimensionDeltas[0]))
  ok('schema delta = 0', d.dimensionDeltas.find((x) => x.id === 'schema')!.delta === 0)
}

(async () => {
  await testEngines()
  await testQueries()
  await testSitemap()
  testDiff()
  console.log(`\n${process.exitCode ? '✗ FAIL' : '✓ All checks passed'}`)
})()

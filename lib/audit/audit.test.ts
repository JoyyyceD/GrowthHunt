/** Unit tests for the GEO audit engine. Run with `bun test`. */
import { test, expect, describe } from 'bun:test'
import * as cheerio from 'cheerio'
import type { AuditContext, DimensionResult, FetchedResource, Dimension } from './types'
import { parseRobots, isAgentBlocked } from './robots'
import { extractJsonLd } from './jsonld'
import { crawlerAccess } from './dimensions/crawler-access'
import { discovery } from './dimensions/discovery'
import { structure } from './dimensions/structure'
import { schema } from './dimensions/schema'
import { factualDensity } from './dimensions/factual-density'
import { entityClarity } from './dimensions/entity-clarity'
import { freshness } from './dimensions/freshness'
import { evaluateGating } from './gating'

function res(text = ''): FetchedResource {
  return { found: text.length > 0, status: text ? 200 : 404, text }
}

function mkCtx(html: string, opts: Partial<AuditContext> = {}): AuditContext {
  const $ = cheerio.load(html)
  const text = ($('body').text() || '').replace(/\s+/g, ' ').trim()
  return {
    url: 'https://example.com',
    normalizedUrl: 'https://example.com/',
    origin: 'https://example.com',
    status: 200,
    headers: {},
    html,
    $,
    text,
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    isSPA: false,
    robotsTxt: res(),
    sitemapXml: res(),
    llmsTxt: res(),
    ...opts,
  }
}

async function runDim(dim: Dimension, ctx: AuditContext): Promise<DimensionResult> {
  return dim.run(ctx)
}

function checkStatus(d: DimensionResult, id: string): string | undefined {
  return d.checks.find((c) => c.id === id)?.status
}

describe('robots.txt parsing', () => {
  test('exact bot group overrides the wildcard group', () => {
    const groups = parseRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /')
    expect(isAgentBlocked(groups, 'GPTBot')).toBe(true)
    expect(isAgentBlocked(groups, 'PerplexityBot')).toBe(false)
  })

  test('Allow: / overrides Disallow: / in the same group', () => {
    const groups = parseRobots('User-agent: ClaudeBot\nDisallow: /\nAllow: /')
    expect(isAgentBlocked(groups, 'ClaudeBot')).toBe(false)
  })

  test('no rules means allowed', () => {
    expect(isAgentBlocked(parseRobots(''), 'OAI-SearchBot')).toBe(false)
  })
})

describe('JSON-LD extraction', () => {
  test('collects types across @graph', () => {
    const $ = cheerio.load(
      '<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":"FAQPage"}]}</script>',
    )
    const ld = extractJsonLd($)
    expect(ld.types).toContain('organization')
    expect(ld.types).toContain('faqpage')
    expect(ld.parseErrors).toBe(0)
  })

  test('counts parse errors on malformed JSON', () => {
    const $ = cheerio.load('<script type="application/ld+json">{bad json</script>')
    expect(extractJsonLd($).parseErrors).toBe(1)
  })
})

describe('crawler-access dimension', () => {
  test('AI bots pass when there is no robots.txt', async () => {
    const d = await runDim(crawlerAccess, mkCtx('<html><body><h1>Hi</h1></body></html>'))
    expect(checkStatus(d, 'claude-bot')).toBe('pass')
    expect(checkStatus(d, 'chatgpt-bot')).toBe('pass')
  })

  test('a blocked bot fails, others still pass', async () => {
    const ctx = mkCtx('<html><body></body></html>', {
      robotsTxt: res('User-agent: ClaudeBot\nDisallow: /'),
    })
    const d = await runDim(crawlerAccess, ctx)
    expect(checkStatus(d, 'claude-bot')).toBe('fail')
    expect(checkStatus(d, 'perplexity-bot')).toBe('pass')
  })

  test('meta noindex fails', async () => {
    const ctx = mkCtx('<html><head><meta name="robots" content="noindex"></head><body></body></html>')
    const d = await runDim(crawlerAccess, ctx)
    expect(checkStatus(d, 'meta-noindex')).toBe('fail')
  })

  test('non-200 status fails http check', async () => {
    const d = await runDim(crawlerAccess, mkCtx('<html></html>', { status: 404 }))
    expect(checkStatus(d, 'http-status')).toBe('fail')
  })
})

describe('discovery dimension', () => {
  test('present, well-formed llms.txt passes', async () => {
    const ctx = mkCtx('<html></html>', {
      llmsTxt: res('# Site\n\n> A short description of the site here.\n\n## Docs\n- [a](https://x.com/a)'),
    })
    const d = await runDim(discovery, ctx)
    expect(checkStatus(d, 'llms-exists')).toBe('pass')
    expect(checkStatus(d, 'llms-structured')).toBe('pass')
  })

  test('sitemap listing the URL passes', async () => {
    const ctx = mkCtx('<html></html>', {
      sitemapXml: res('<urlset><url><loc>https://example.com/</loc></url></urlset>'),
    })
    const d = await runDim(discovery, ctx)
    expect(checkStatus(d, 'sitemap-exists')).toBe('pass')
    expect(checkStatus(d, 'url-in-sitemap')).toBe('pass')
  })

  test('missing sitemap fails', async () => {
    const d = await runDim(discovery, mkCtx('<html></html>'))
    expect(checkStatus(d, 'sitemap-exists')).toBe('fail')
  })
})

describe('structure dimension', () => {
  test('one H1, a question H2 and a list score well', async () => {
    const html = '<html><body><main><h1>Title</h1><h2>How does it work?</h2><ul><li>x</li></ul>'
      + '<section><p>' + 'word '.repeat(320) + '</p></section></main></body></html>'
    const d = await runDim(structure, mkCtx(html))
    expect(checkStatus(d, 'single-h1')).toBe('pass')
    expect(checkStatus(d, 'faq-section')).toBe('pass')
    expect(checkStatus(d, 'lists-tables')).toBe('pass')
  })

  test('no H1 fails', async () => {
    const d = await runDim(structure, mkCtx('<html><body><p>no heading</p></body></html>'))
    expect(checkStatus(d, 'single-h1')).toBe('fail')
  })
})

describe('schema dimension', () => {
  test('Organization + Article + FAQPage JSON-LD scores well', async () => {
    const ld = JSON.stringify([
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'X', sameAs: ['https://x.com/x'] },
      { '@context': 'https://schema.org', '@type': 'Article', headline: 'Y' },
      { '@context': 'https://schema.org', '@type': 'FAQPage' },
    ])
    const ctx = mkCtx(`<html><head><script type="application/ld+json">${ld}</script></head><body></body></html>`)
    const d = await runDim(schema, ctx)
    expect(checkStatus(d, 'jsonld-present')).toBe('pass')
    expect(checkStatus(d, 'org-schema')).toBe('pass')
    expect(checkStatus(d, 'page-type-schema')).toBe('pass')
    expect(checkStatus(d, 'faq-schema')).toBe('pass')
  })

  test('no JSON-LD fails and marks validity n/a', async () => {
    const d = await runDim(schema, mkCtx('<html><body></body></html>'))
    expect(checkStatus(d, 'jsonld-present')).toBe('fail')
    expect(checkStatus(d, 'jsonld-valid')).toBe('na')
  })
})

describe('factual-density dimension', () => {
  test('number- and citation-rich copy scores above half', async () => {
    const copy = 'In 2025, 80% of 1,200 surveyed founders saved 3 hours a week. '
      + 'According to a study, revenue rose 40% and costs fell 25% over 12 months. '
      + 'Research shows the median team spent $4,000 and 5 days onboarding.'
    const d = await runDim(factualDensity, mkCtx(`<html><body><p>${copy}</p></body></html>`))
    expect(d.percent).toBeGreaterThan(50)
  })
})

describe('entity-clarity dimension', () => {
  test('brand in title and H1 passes', async () => {
    const html = '<html><head><title>Acme — the invoicing tool</title>'
      + '<meta property="og:site_name" content="Acme">'
      + '<meta name="description" content="Acme is invoicing software for freelancers and very small teams."></head>'
      + '<body><h1>Acme makes invoicing simple</h1><p>Acme helps you bill clients.</p>'
      + '<a href="/about">About</a></body></html>'
    const d = await runDim(entityClarity, mkCtx(html))
    expect(checkStatus(d, 'name-in-title')).toBe('pass')
    expect(checkStatus(d, 'name-in-h1')).toBe('pass')
    expect(checkStatus(d, 'about-contact')).toBe('pass')
  })
})

describe('freshness dimension', () => {
  test('recent schema date passes not-stale', async () => {
    const recent = new Date().toISOString()
    const ld = JSON.stringify({ '@type': 'Article', dateModified: recent })
    const ctx = mkCtx(`<html><head><script type="application/ld+json">${ld}</script></head><body></body></html>`)
    const d = await runDim(freshness, ctx)
    expect(checkStatus(d, 'schema-dates')).toBe('pass')
    expect(checkStatus(d, 'not-stale')).toBe('pass')
  })
})

describe('gating', () => {
  test('all AI bots blocked triggers the gating flag', () => {
    const robots = 'User-agent: OAI-SearchBot\nDisallow: /\n'
      + 'User-agent: PerplexityBot\nDisallow: /\n'
      + 'User-agent: ClaudeBot\nDisallow: /'
    const flags = evaluateGating(mkCtx('<html></html>', { robotsTxt: res(robots) }))
    expect(flags.find((f) => f.id === 'ai-bots-blocked')?.triggered).toBe(true)
  })

  test('404 triggers the not-analyzable flag', () => {
    const flags = evaluateGating(mkCtx('<html></html>', { status: 404 }))
    expect(flags.find((f) => f.id === 'not-analyzable')?.triggered).toBe(true)
  })

  test('a clean page triggers nothing', () => {
    const flags = evaluateGating(mkCtx('<html><body><h1>Hi</h1></body></html>'))
    expect(flags.every((f) => !f.triggered)).toBe(true)
  })
})

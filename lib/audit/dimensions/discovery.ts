/** Indexability & Discovery — can engines find your pages and what you offer? */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'

const META = { id: 'discovery', label: 'Indexability & Discovery', weight: 12, version: '1.0.0' }

function canonicalCheck(ctx: AuditContext): Check {
  const href = ctx.$('link[rel="canonical"]').attr('href')?.trim()
  if (!href) {
    return mkCheck('canonical', 'Canonical tag present', 10, 'fail',
      { detail: 'No <link rel="canonical">', fix: 'Add a self-referential canonical link in <head>' })
  }
  try {
    const canon = new URL(href, ctx.normalizedUrl)
    const sameOrigin = canon.origin === ctx.origin
    return mkCheck('canonical', 'Canonical tag present and self-referential', 10, sameOrigin ? 'pass' : 'partial',
      sameOrigin
        ? { detail: `Canonical: ${canon.pathname}` }
        : { detail: `Canonical points off-origin (${canon.origin})`, fix: 'Point the canonical URL at this page' })
  } catch {
    return mkCheck('canonical', 'Canonical tag present', 10, 'partial',
      { detail: `Canonical href is not a valid URL: ${href}` })
  }
}

function sitemapUrlCheck(ctx: AuditContext): Check {
  if (!ctx.sitemapXml.found) {
    return mkCheck('url-in-sitemap', 'URL listed in sitemap', 12, 'na',
      { detail: 'No sitemap.xml to check' })
  }
  const xml = ctx.sitemapXml.text
  const bare = ctx.normalizedUrl.replace(/\/$/, '')
  const present = xml.includes(ctx.normalizedUrl) || xml.includes(bare)
  if (present) {
    return mkCheck('url-in-sitemap', 'URL listed in sitemap', 12, 'pass',
      { detail: 'This URL is listed in sitemap.xml' })
  }
  if (/<sitemapindex/i.test(xml)) {
    return mkCheck('url-in-sitemap', 'URL listed in sitemap', 12, 'na',
      { detail: 'sitemap.xml is an index; per-URL listing not verified' })
  }
  return mkCheck('url-in-sitemap', 'URL listed in sitemap', 12, 'fail',
    { detail: 'URL not found in sitemap.xml', fix: 'Add this page to your sitemap' })
}

function llmsStructureCheck(ctx: AuditContext): Check {
  if (!ctx.llmsTxt.found) {
    return mkCheck('llms-structured', 'llms.txt well-structured', 8, 'na', { detail: 'No llms.txt' })
  }
  const txt = ctx.llmsTxt.text
  const hasH1 = /^#\s+\S/m.test(txt)
  const hasSections = /^##\s+\S/m.test(txt)
  const hasSummary = /^>\s+\S/m.test(txt) || txt.split(/\r?\n/).some((l) => l.trim().length > 30 && !l.startsWith('#'))
  const score = [hasH1, hasSections, hasSummary].filter(Boolean).length
  const status = score === 3 ? 'pass' : score >= 1 ? 'partial' : 'fail'
  return mkCheck('llms-structured', 'llms.txt well-structured', 8, status,
    status === 'pass'
      ? { detail: 'llms.txt has an H1, summary and sections' }
      : { detail: 'llms.txt is missing H1 / summary / section structure', fix: 'Structure llms.txt: H1 site name → summary → ## sections with links' })
}

export const discovery: Dimension = {
  ...META,
  run(ctx: AuditContext) {
    const checks: Check[] = []

    checks.push(mkCheck('sitemap-exists', 'sitemap.xml present', 12,
      ctx.sitemapXml.found ? 'pass' : 'fail',
      ctx.sitemapXml.found
        ? { detail: 'sitemap.xml found' }
        : { detail: 'No sitemap.xml', fix: 'Publish a sitemap.xml so crawlers can discover every page' },
    ))

    checks.push(sitemapUrlCheck(ctx))
    checks.push(canonicalCheck(ctx))

    checks.push(mkCheck('llms-exists', '/llms.txt present', 14,
      ctx.llmsTxt.found ? 'pass' : 'fail',
      ctx.llmsTxt.found
        ? { detail: 'llms.txt found' }
        : { detail: 'No /llms.txt', fix: 'Add /llms.txt — a curated map of your site for AI crawlers' },
    ))

    checks.push(llmsStructureCheck(ctx))

    const rss = ctx.$('link[type="application/rss+xml"], link[type="application/atom+xml"]').length > 0
    checks.push(mkCheck('rss-feed', 'RSS / Atom feed', 6, rss ? 'pass' : 'fail',
      rss
        ? { detail: 'Feed link declared in <head>' }
        : { detail: 'No RSS/Atom feed link', fix: 'Expose an RSS/Atom feed — a strong freshness signal for crawlers' },
    ))

    return buildDimension(META, checks)
  },
}

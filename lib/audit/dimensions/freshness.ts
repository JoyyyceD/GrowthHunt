/** Freshness — dated content, recency and an actively-updated site. */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'
import { extractJsonLd, findStringValue } from '../jsonld'

const META = { id: 'freshness', label: 'Freshness', weight: 10, version: '1.0.0' }

const DAY_MS = 86_400_000

function parseDate(s: string | undefined | null): Date | null {
  if (!s) return null
  const d = new Date(s.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

function newest(dates: (Date | null)[]): Date | null {
  let best: Date | null = null
  for (const d of dates) {
    if (d && (!best || d > best)) best = d
  }
  return best
}

export const freshness: Dimension = {
  ...META,
  run(ctx: AuditContext) {
    const now = Date.now()
    const ld = extractJsonLd(ctx.$)
    const checks: Check[] = []

    const schemaDate = findStringValue(ld.nodes, ['dateModified', 'datePublished'])
    checks.push(mkCheck('schema-dates', 'schema 含发布 / 修改日期', 10,
      schemaDate ? 'pass' : 'fail',
      schemaDate
        ? { detail: `Schema date: ${schemaDate}` }
        : { detail: 'No datePublished/dateModified in schema', fix: 'Add datePublished and dateModified to your page schema' },
    ))

    const timeEl = ctx.$('time[datetime]').first().attr('datetime')
    const articleModified = ctx.$('meta[property="article:modified_time"]').attr('content')
    const articlePublished = ctx.$('meta[property="article:published_time"]').attr('content')
    const visibleDate = timeEl || articleModified || articlePublished
    checks.push(mkCheck('visible-date', '页面有可见 / 标注日期', 8,
      visibleDate ? 'pass' : 'fail',
      visibleDate
        ? { detail: 'Dated via <time> or article meta' }
        : { detail: 'No <time> element or article date meta', fix: 'Show a published/updated date with a <time> element' },
    ))

    const currentYear = String(new Date().getFullYear())
    const hasCurrentYear = ctx.text.includes(currentYear)
    checks.push(mkCheck('current-year', `正文出现当年年份 (${currentYear})`, 8,
      hasCurrentYear ? 'pass' : 'fail',
      hasCurrentYear
        ? { detail: `Mentions ${currentYear}` }
        : { detail: `No mention of ${currentYear}`, fix: 'Reference the current year so the page reads as current' },
    ))

    const recent = newest([
      parseDate(schemaDate), parseDate(timeEl), parseDate(articleModified), parseDate(articlePublished),
    ])
    if (!recent) {
      checks.push(mkCheck('not-stale', '内容未过期（<12 个月）', 14, 'na',
        { detail: 'No machine-readable date found' }))
    } else {
      const ageDays = (now - recent.getTime()) / DAY_MS
      checks.push(mkCheck('not-stale', '内容未过期（<12 个月）', 14,
        ageDays <= 180 ? 'pass' : ageDays <= 365 ? 'partial' : 'fail',
        { detail: `Last dated ${Math.round(ageDays)} days ago`,
          fix: ageDays > 365 ? 'Refresh and re-date the content — stale pages lose citations' : undefined },
      ))
    }

    const lastmods = (ctx.sitemapXml.text.match(/<lastmod>([^<]+)<\/lastmod>/gi) || [])
      .map((m) => parseDate(m.replace(/<\/?lastmod>/gi, '')))
    const freshestSitemap = newest(lastmods)
    if (!ctx.sitemapXml.found || !freshestSitemap) {
      checks.push(mkCheck('sitemap-freshness', '站点近期有更新（sitemap lastmod）', 10, 'na',
        { detail: ctx.sitemapXml.found ? 'sitemap.xml has no <lastmod> dates' : 'No sitemap.xml' }))
    } else {
      const ageDays = (now - freshestSitemap.getTime()) / DAY_MS
      checks.push(mkCheck('sitemap-freshness', '站点近期有更新（sitemap lastmod）', 10,
        ageDays <= 90 ? 'pass' : ageDays <= 365 ? 'partial' : 'fail',
        { detail: `Newest sitemap entry ${Math.round(ageDays)} days old`,
          fix: ageDays > 90 ? 'Publish regularly — an actively-updated site is crawled more often' : undefined },
      ))
    }

    return buildDimension(META, checks)
  },
}

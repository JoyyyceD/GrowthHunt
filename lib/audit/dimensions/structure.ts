/** Structure — heading hierarchy, lists, FAQ and semantic markup. */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'
import { extractJsonLd } from '../jsonld'

const META = { id: 'structure', label: 'Structure', weight: 15, version: '1.0.0' }

function headingOrderCheck(ctx: AuditContext): Check {
  const levels: number[] = []
  ctx.$('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const tag = (el as { tagName?: string }).tagName
    if (tag) levels.push(Number(tag[1]))
  })
  if (levels.length === 0) {
    return mkCheck('heading-order', 'Heading levels not skipped', 10, 'fail',
      { detail: 'No headings on the page', fix: 'Add a clear H1→H2→H3 heading outline' })
  }
  let skips = 0
  for (let i = 1; i < levels.length; i++) {
    if (levels[i]! - levels[i - 1]! > 1) skips++
  }
  const status = skips === 0 ? 'pass' : skips <= 2 ? 'partial' : 'fail'
  return mkCheck('heading-order', 'Heading levels not skipped', 10, status,
    status === 'pass'
      ? { detail: `${levels.length} headings, no skipped levels` }
      : { detail: `${skips} skipped heading level(s)`, fix: 'Do not jump heading levels (e.g. H2 straight to H4)' })
}

function faqCheck(ctx: AuditContext): Check {
  const hasFaqSchema = extractJsonLd(ctx.$).types.includes('faqpage')
  let questionHeading = false
  ctx.$('h2,h3').each((_, el) => {
    if (ctx.$(el).text().includes('?') || ctx.$(el).text().includes('？')) questionHeading = true
  })
  const hasDetails = ctx.$('details').length > 0
  const hasFaqContainer = ctx.$('[id*="faq" i], [class*="faq" i]').length > 0
  const ok = hasFaqSchema || questionHeading || hasDetails || hasFaqContainer
  return mkCheck('faq-section', 'Has an FAQ section', 14, ok ? 'pass' : 'fail',
    ok
      ? { detail: hasFaqSchema ? 'FAQPage schema present' : 'Question-style section detected' }
      : { detail: 'No FAQ section found', fix: 'Add an FAQ section — question H2s with direct answers feed AI citations' })
}

export const structure: Dimension = {
  ...META,
  run(ctx: AuditContext) {
    const checks: Check[] = []

    const h1Count = ctx.$('h1').length
    checks.push(mkCheck('single-h1', 'Exactly one H1', 14,
      h1Count === 1 ? 'pass' : h1Count === 0 ? 'fail' : 'partial',
      h1Count === 1
        ? { detail: 'Exactly one H1' }
        : { detail: `${h1Count} H1 elements`, fix: 'Use exactly one H1 stating the page topic' },
    ))

    checks.push(headingOrderCheck(ctx))

    const lists = ctx.$('ul,ol').length
    const tables = ctx.$('table').length
    checks.push(mkCheck('lists-tables', 'Uses lists / tables', 10,
      lists + tables > 0 ? 'pass' : 'fail',
      lists + tables > 0
        ? { detail: `${lists} list(s), ${tables} table(s)` }
        : { detail: 'No lists or tables', fix: 'Break dense content into lists/tables — easier for AI to extract' },
    ))

    checks.push(faqCheck(ctx))

    const wc = ctx.wordCount
    checks.push(mkCheck('content-depth', 'Content not too thin', 12,
      wc >= 300 ? 'pass' : wc >= 150 ? 'partial' : 'fail',
      { detail: `${wc} words`, fix: wc < 300 ? 'Add substantive content — thin pages rarely get cited' : undefined },
    ))

    const semantic = ctx.$('main,article,section,nav,aside,header,footer').length
    checks.push(mkCheck('semantic-html', 'Semantic HTML elements', 8,
      semantic >= 3 ? 'pass' : semantic >= 1 ? 'partial' : 'fail',
      semantic >= 3
        ? { detail: `${semantic} semantic landmark element(s)` }
        : { detail: 'Few/no semantic landmarks', fix: 'Use <main>, <article>, <section> instead of bare <div>s' },
    ))

    return buildDimension(META, checks)
  },
}

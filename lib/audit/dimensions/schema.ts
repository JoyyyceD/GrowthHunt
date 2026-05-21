/** Schema — JSON-LD structured data and Open Graph tags. */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'
import { extractJsonLd } from '../jsonld'

const META = { id: 'schema', label: 'Schema', weight: 12, version: '1.0.0' }

const ORG_TYPES = ['organization', 'website', 'localbusiness', 'corporation']
const PAGE_TYPES = [
  'article', 'blogposting', 'newsarticle', 'techarticle',
  'product', 'softwareapplication', 'webapplication',
  'howto', 'recipe', 'webpage', 'collectionpage', 'service',
]

function hasSameAs(nodes: Record<string, unknown>[]): boolean {
  return nodes.some((n) => {
    const v = n['sameAs']
    return typeof v === 'string' ? v.length > 0 : Array.isArray(v) && v.length > 0
  })
}

export const schema: Dimension = {
  ...META,
  run(ctx: AuditContext) {
    const ld = extractJsonLd(ctx.$)
    const checks: Check[] = []

    checks.push(mkCheck('jsonld-present', 'JSON-LD present', 14,
      ld.blocks > 0 ? 'pass' : 'fail',
      ld.blocks > 0
        ? { detail: `${ld.blocks} JSON-LD block(s)` }
        : { detail: 'No JSON-LD structured data', fix: 'Add <script type="application/ld+json"> with schema.org markup' },
    ))

    if (ld.blocks === 0) {
      checks.push(mkCheck('jsonld-valid', 'JSON-LD parses cleanly', 8, 'na', { detail: 'No JSON-LD' }))
    } else {
      checks.push(mkCheck('jsonld-valid', 'JSON-LD parses cleanly', 8,
        ld.parseErrors === 0 ? 'pass' : 'fail',
        ld.parseErrors === 0
          ? { detail: 'All JSON-LD blocks parse cleanly' }
          : { detail: `${ld.parseErrors} JSON-LD block(s) failed to parse`, fix: 'Fix the malformed JSON-LD — invalid blocks are ignored by crawlers' },
      ))
    }

    const hasOrg = ld.types.some((t) => ORG_TYPES.includes(t))
    checks.push(mkCheck('org-schema', 'Organization / WebSite schema', 10,
      hasOrg ? 'pass' : 'fail',
      hasOrg
        ? { detail: 'Organization/WebSite entity declared' }
        : { detail: 'No Organization or WebSite schema', fix: 'Add an Organization schema so engines can resolve your brand entity' },
    ))

    const pageType = ld.types.find((t) => PAGE_TYPES.includes(t))
    checks.push(mkCheck('page-type-schema', 'Page-type schema', 12,
      pageType ? 'pass' : 'fail',
      pageType
        ? { detail: `Page-type schema: ${pageType}` }
        : { detail: 'No page-type schema (Article/Product/etc.)', fix: 'Add the schema type that matches this page (Article, Product, SoftwareApplication…)' },
    ))

    const hasFaq = ld.types.includes('faqpage')
    checks.push(mkCheck('faq-schema', 'FAQPage schema', 8, hasFaq ? 'pass' : 'fail',
      hasFaq
        ? { detail: 'FAQPage schema present' }
        : { detail: 'No FAQPage schema', fix: 'Mark up your FAQ with FAQPage schema — directly citable Q&A pairs' },
    ))

    const og = ['og:title', 'og:description', 'og:type'].filter(
      (p) => (ctx.$(`meta[property="${p}"]`).attr('content') || '').trim().length > 0,
    ).length
    checks.push(mkCheck('og-tags', 'Open Graph tags complete', 8,
      og === 3 ? 'pass' : og >= 1 ? 'partial' : 'fail',
      og === 3
        ? { detail: 'og:title / og:description / og:type all set' }
        : { detail: `${og}/3 core Open Graph tags`, fix: 'Add og:title, og:description and og:type' },
    ))

    checks.push(mkCheck('sameas', 'sameAs entity links', 6,
      hasSameAs(ld.nodes) ? 'pass' : 'fail',
      hasSameAs(ld.nodes)
        ? { detail: 'sameAs links present' }
        : { detail: 'No sameAs links in schema', fix: 'Add sameAs links (social / Crunchbase / Wikipedia) to strengthen entity recognition' },
    ))

    return buildDimension(META, checks)
  },
}

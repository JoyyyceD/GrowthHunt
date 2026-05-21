/** Entity Clarity — is the brand/product name consistent and discoverable? */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'
import { extractJsonLd } from '../jsonld'

const META = { id: 'entity-clarity', label: 'Entity Clarity', weight: 10, version: '1.0.0' }

const ORG_TYPES = ['organization', 'website', 'corporation', 'localbusiness']

/** Best guess at the brand name: og:site_name → schema name → domain label. */
function deriveBrand(ctx: AuditContext): string {
  const ogSite = ctx.$('meta[property="og:site_name"]').attr('content')?.trim()
  if (ogSite) return ogSite

  const ld = extractJsonLd(ctx.$)
  const orgNode = ld.nodes.find((n) => {
    const t = n['@type']
    const types = Array.isArray(t) ? t : [t]
    return types.some((x) => typeof x === 'string' && ORG_TYPES.includes(x.toLowerCase()))
  })
  if (orgNode && typeof orgNode['name'] === 'string' && orgNode['name'].trim()) {
    return orgNode['name'].trim()
  }

  const host = new URL(ctx.normalizedUrl).hostname.replace(/^www\./, '')
  return host.split('.')[0] || host
}

export const entityClarity: Dimension = {
  ...META,
  run(ctx: AuditContext) {
    const brand = deriveBrand(ctx)
    const brandLc = brand.toLowerCase()
    const checks: Check[] = []

    const title = (ctx.$('title').first().text() || '').trim()
    checks.push(mkCheck('title-present', 'title 标签存在且长度合理', 8,
      title && title.length >= 10 && title.length <= 70 ? 'pass'
        : title ? 'partial' : 'fail',
      { detail: title ? `Title (${title.length} chars)` : 'No <title>',
        fix: !title ? 'Add a <title>' : (title.length > 70 || title.length < 10) ? 'Keep the title roughly 10–70 characters' : undefined },
    ))

    const metaDesc = (ctx.$('meta[name="description"]').attr('content') || '').trim()
    checks.push(mkCheck('meta-desc-present', 'meta description 存在', 8,
      metaDesc && metaDesc.length >= 50 && metaDesc.length <= 160 ? 'pass'
        : metaDesc ? 'partial' : 'fail',
      { detail: metaDesc ? `Meta description (${metaDesc.length} chars)` : 'No meta description',
        fix: !metaDesc ? 'Add a 50–160 char meta description' : undefined },
    ))

    checks.push(mkCheck('name-in-title', '品牌名出现在 title', 8,
      title.toLowerCase().includes(brandLc) ? 'pass' : 'fail',
      { detail: `Brand "${brand}" ${title.toLowerCase().includes(brandLc) ? 'in' : 'missing from'} title`,
        fix: !title.toLowerCase().includes(brandLc) ? 'Include the brand name in the <title>' : undefined },
    ))

    const h1 = (ctx.$('h1').first().text() || '').toLowerCase()
    checks.push(mkCheck('name-in-h1', '品牌名出现在 H1', 12,
      h1.includes(brandLc) ? 'pass' : 'partial',
      { detail: `Brand "${brand}" ${h1.includes(brandLc) ? 'in' : 'missing from'} H1`,
        fix: !h1.includes(brandLc) ? 'Reference the brand/product name in the H1' : undefined },
    ))

    checks.push(mkCheck('name-in-meta-desc', '品牌名出现在 meta description', 8,
      metaDesc.toLowerCase().includes(brandLc) ? 'pass' : 'fail',
      { detail: metaDesc.toLowerCase().includes(brandLc) ? 'Brand named in meta description' : 'Brand not in meta description',
        fix: !metaDesc.toLowerCase().includes(brandLc) ? 'Mention the brand in the meta description' : undefined },
    ))

    const firstChunk = ctx.text.slice(0, 250).toLowerCase()
    checks.push(mkCheck('name-in-first-para', '品牌名出现在首段', 10,
      firstChunk.includes(brandLc) ? 'pass' : 'fail',
      { detail: firstChunk.includes(brandLc) ? 'Brand named in opening copy' : 'Brand absent from opening copy',
        fix: !firstChunk.includes(brandLc) ? 'Name the brand/product in the first sentences' : undefined },
    ))

    const aboutContact = ctx.$('a[href*="about" i], a[href*="contact" i]').length > 0
    checks.push(mkCheck('about-contact', 'About / Contact 链接', 6,
      aboutContact ? 'pass' : 'fail',
      { detail: aboutContact ? 'About/Contact link present' : 'No About/Contact link',
        fix: !aboutContact ? 'Link to About/Contact pages — they anchor your entity' : undefined },
    ))

    return buildDimension(META, checks)
  },
}

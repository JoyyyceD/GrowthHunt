/**
 * Onboarding pipeline smoke — gatherIntel + first two doc generators on a
 * real site. Same input Ollie was demoed on, so output quality is directly
 * comparable. Run: bun scripts/scout-onboard-smoke.ts [url]
 */
import { gatherIntel } from '../lib/scout/intel'
import { generateDoc } from '../lib/scout/docgen'
import { businessProfile } from '../lib/scout/docgen/business-profile'
import { brandGuidelines } from '../lib/scout/docgen/brand-guidelines'
import { mkdirSync, writeFileSync } from 'node:fs'

const url = process.argv[2] || 'https://evermemory.ai'
const t0 = Date.now()

const { intel, pages, searches } = await gatherIntel(url, {
  onStage: (stage, detail) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${stage} ${detail}`),
})

console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] intel ready`)
console.log('  pages read:', pages.map(p => `${p.url} (${p.source}, ${p.markdown.length}ch)`).join('\n              '))
console.log('  searches:', searches.map(s => `${s.q} → ${s.r.results.length} results`).join(' | '))
console.log('  product:', intel.product.name, '—', intel.product.oneLiner)
console.log('  category:', intel.product.category)
console.log('  competitors:', intel.competitors.map(c => c.name).join(', '))
console.log('  dataPoints:', intel.market.dataPoints.length, '| palette:', intel.brand.palette.length, '| confidence:', JSON.stringify(intel.confidence))

mkdirSync('.scout-smoke', { recursive: true })
writeFileSync('.scout-smoke/intel.json', JSON.stringify(intel, null, 2))

for (const spec of [businessProfile, brandGuidelines]) {
  const td = Date.now()
  const doc = await generateDoc(spec, intel)
  writeFileSync(`.scout-smoke/${doc.slug}.md`, doc.contentMd)
  console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${doc.slug} — ${doc.contentMd.length} chars in ${((Date.now() - td) / 1000).toFixed(1)}s`)
  console.log(`  summary: ${doc.summary}`)
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s → .scout-smoke/`)

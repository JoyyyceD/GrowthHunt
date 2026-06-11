/**
 * Batch D quality run — generate full doc sets for the test URL list.
 * Output: .scout-smoke/quality/{domain}/intel.json + 7 *.md
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { gatherIntel } from '../lib/scout/intel'
import { generateDoc } from '../lib/scout/docgen'
import { onboardingDocs } from '../lib/scout/docgen/all'
import { matchCases, buildCaseNotes } from '../lib/scout/case-match'

const URLS = (process.argv[2] ? [process.argv[2]] : [
  'resend.com', 'flighty.com', 'jenni.ai', 'graza.co', 'lennysnewsletter.com',
  'mercury.com', 'eightsleep.com', 'papermark.io', 'growthhunt.ai', 'cal.com',
])

for (const url of URLS) {
  const domain = url.replace(/^https?:\/\//, '').replace(/\W+/g, '-')
  const dir = `.scout-smoke/quality/${domain}`
  mkdirSync(dir, { recursive: true })
  const t0 = Date.now()
  try {
    const { intel } = await gatherIntel(url, { brief: undefined })
    writeFileSync(`${dir}/intel.json`, JSON.stringify(intel, null, 1))
    const caseNotes = buildCaseNotes(await matchCases(intel).catch(() => []))
    let ok = 0
    for (const spec of onboardingDocs(caseNotes)) {
      try {
        const doc = await generateDoc(spec, intel)
        writeFileSync(`${dir}/${doc.slug}.md`, doc.contentMd)
        ok++
      } catch (e) {
        console.log(`  ✗ ${url} ${spec.slug}: ${(e as Error).message.slice(0, 80)}`)
      }
    }
    console.log(`OK ${url}: ${ok}/7 docs in ${((Date.now() - t0) / 1000).toFixed(0)}s (cases: ${caseNotes ? 'yes' : 'none'})`)
  } catch (e) {
    console.log(`FAIL ${url}: ${(e as Error).message.slice(0, 120)}`)
  }
}
console.log('QUALITY RUN COMPLETE')

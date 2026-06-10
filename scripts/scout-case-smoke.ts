import { readFileSync } from 'node:fs'
import { caseCatalog, matchCases, buildCaseNotes } from '../lib/scout/case-match'

console.log('catalog size:', caseCatalog().length)
const intel = JSON.parse(readFileSync('.scout-smoke/intel.json', 'utf8')) // EverMemory intel
const matches = await matchCases(intel)
console.log('matches:', JSON.stringify(matches, null, 1).slice(0, 800))
console.log('--- caseNotes ---')
console.log(buildCaseNotes(matches) || '(none — gracefully omitted)')

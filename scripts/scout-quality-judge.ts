/**
 * Batch D scorer — judge each generated doc on the spec §5 rubric (1-5 per
 * dimension) with DeepSeek as grader. Pass bar: avg ≥4, no dimension ≤2.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { chatStream } from '../lib/scout/client'
import { parseToolArgs } from '../lib/scout/intel'

const ROOT = '.scout-smoke/quality'
const RUBRIC_TOOL = {
  name: 'submit_scores',
  description: 'Submit rubric scores for the document.',
  parameters: {
    type: 'object',
    properties: {
      factual: { type: 'number', description: '1-5: no invented stats/prices; every specific number traceable to the intelligence' },
      specific: { type: 'number', description: '1-5: names, numbers, channels; recognizable as THIS brand with the name removed' },
      voice: { type: 'number', description: '1-5: matches the brand toneWords/voiceObservations in the intelligence' },
      actionable: { type: 'number', description: '1-5: usable as-is by a founder today' },
      format: { type: 'number', description: '1-5: follows the expected structure, clean markdown' },
      invented_numbers: { type: 'array', items: { type: 'string' }, description: 'FACT-CLAIM figures not in the intelligence: market sizes, product achievements, competitor names/prices absent from the intelligence, outcome claims. Do NOT flag (a) prescriptions like posting frequency, pillar percentages, response windows, or (b) persona illustration details (ages, cities, company sizes) when the doc frames personas as illustrative. Empty if none.' },
      worst_line: { type: 'string', description: 'the single weakest line, quoted' },
    },
    required: ['factual', 'specific', 'voice', 'actionable', 'format', 'invented_numbers', 'worst_line'],
  },
}

interface Row { domain: string; slug: string; scores: number[]; invented: string[]; worst: string }
const rows: Row[] = []

for (const domain of readdirSync(ROOT)) {
  const dir = `${ROOT}/${domain}`
  if (!existsSync(`${dir}/intel.json`)) continue
  const intel = readFileSync(`${dir}/intel.json`, 'utf8')
  for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const doc = readFileSync(`${dir}/${file}`, 'utf8')
    try {
      const r = await chatStream({
        kind: 'quality-judge', maxTokens: 1500, temperature: 0, stream: false,
        tools: [RUBRIC_TOOL],
        messages: [
          { role: 'system', content: 'You are a strict marketing-document grader. Score harshly: 5 = a senior strategist would ship it unchanged; 3 = needs edits; 1 = unusable. Any invented FACT-CLAIM number caps factual at 2 — but prescriptions (recommended frequencies/percentages) and explicitly-illustrative persona details are NOT inventions. Call submit_scores.' },
          { role: 'user', content: `INTELLIGENCE (source of truth):\n${intel.slice(0, 9000)}\n\nDOCUMENT (${file}):\n${doc.slice(0, 9000)}` },
        ],
      })
      const call = r.toolCalls.find(c => c.name === 'submit_scores')
      const p = call ? parseToolArgs(call.arguments) as Record<string, unknown> : null
      if (!p) { console.log(`judge-miss ${domain}/${file}`); continue }
      rows.push({
        domain, slug: file.replace('.md', ''),
        scores: [p.factual, p.specific, p.voice, p.actionable, p.format].map(Number),
        invented: (p.invented_numbers as string[]) || [],
        worst: String(p.worst_line || ''),
      })
    } catch (e) {
      console.log(`judge-fail ${domain}/${file}: ${(e as Error).message.slice(0, 60)}`)
    }
  }
  console.log(`judged ${domain}`)
}

const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length
console.log('\n=== PER-URL SUMMARY (factual/specific/voice/actionable/format) ===')
const byDomain = new Map<string, Row[]>()
rows.forEach(r => byDomain.set(r.domain, [...(byDomain.get(r.domain) || []), r]))
for (const [d, rs] of byDomain) {
  const dims = [0, 1, 2, 3, 4].map(i => avg(rs.map(r => r.scores[i])).toFixed(1))
  const overall = avg(rs.flatMap(r => r.scores)).toFixed(2)
  const fails = rs.filter(r => avg(r.scores) < 4 || r.scores.some(s => s <= 2))
  console.log(`${d}: ${dims.join('/')} → avg ${overall}${fails.length ? `  ⚠ below-bar: ${fails.map(f => f.slug).join(', ')}` : ' ✓'}`)
}
console.log('\n=== INVENTED NUMBERS (must be empty) ===')
rows.filter(r => r.invented.length).forEach(r => console.log(`${r.domain}/${r.slug}: ${r.invented.join(' | ')}`))
console.log('\n=== GRAND AVG:', avg(rows.flatMap(r => r.scores)).toFixed(2), '===')
writeFileSync('.scout-smoke/quality/report.json', JSON.stringify(rows, null, 1))
console.log('JUDGE COMPLETE')

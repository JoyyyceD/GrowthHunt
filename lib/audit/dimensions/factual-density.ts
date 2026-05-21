/** Factual Density — numbers, dates, citations and concrete specifics. */
import type { AuditContext, Check, Dimension } from '../types'
import { mkCheck, buildDimension } from './_helpers'

const META = { id: 'factual-density', label: 'Factual Density', weight: 13, version: '1.0.0' }

const CITATION_PHRASES = [
  'according to', 'research shows', 'studies show', 'study found', 'studies found',
  'data from', 'survey', 'report found', 'reports show', 'found that',
  'research from', 'as reported by', 'evidence suggests', 'statistics show',
]

const MONTHS = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i

export const factualDensity: Dimension = {
  ...META,
  run(ctx: AuditContext) {
    const text = ctx.text
    const lower = text.toLowerCase()
    const words = Math.max(ctx.wordCount, 1)
    const checks: Check[] = []

    const numberCount = (text.match(/\d[\d,.]*/g) || []).length
    const perK = (numberCount / words) * 1000
    checks.push(mkCheck('numbers-density', '数字 / 数据密度', 14,
      perK >= 15 ? 'pass' : perK >= 5 ? 'partial' : 'fail',
      { detail: `${numberCount} numbers (${perK.toFixed(1)} per 1k words)`,
        fix: perK < 15 ? 'Add concrete numbers — counts, sizes, dates make a page more citable' : undefined },
    ))

    const pctCount = (text.match(/\d+(?:\.\d+)?\s?%/g) || []).length
    checks.push(mkCheck('percentages', '包含百分比', 8,
      pctCount >= 2 ? 'pass' : pctCount === 1 ? 'partial' : 'fail',
      { detail: `${pctCount} percentage figure(s)`,
        fix: pctCount === 0 ? 'Quantify claims with percentages where possible' : undefined },
    ))

    const hasYear = /\b(?:19|20)\d{2}\b/.test(text)
    const hasMonth = MONTHS.test(text)
    checks.push(mkCheck('dates-years', '包含年份 / 日期', 8,
      hasYear && hasMonth ? 'pass' : hasYear || hasMonth ? 'partial' : 'fail',
      { detail: hasYear || hasMonth ? 'Dates/years present in copy' : 'No dates or years in copy',
        fix: !hasYear ? 'Reference specific years/dates to anchor facts in time' : undefined },
    ))

    let citationCount = 0
    for (const phrase of CITATION_PHRASES) {
      let idx = lower.indexOf(phrase)
      while (idx !== -1) { citationCount++; idx = lower.indexOf(phrase, idx + phrase.length) }
    }
    checks.push(mkCheck('citation-phrases', '引用 / 来源句式', 12,
      citationCount >= 2 ? 'pass' : citationCount === 1 ? 'partial' : 'fail',
      { detail: `${citationCount} sourcing phrase(s) (e.g. "according to")`,
        fix: citationCount < 2 ? 'Attribute facts to sources — AI engines favour sourced claims' : undefined },
    ))

    const currency = (text.match(/[$€£¥]\s?\d/g) || []).length
    const units = (text.match(/\b\d+(?:\.\d+)?\s?(?:ms|kb|mb|gb|tb|km|kg|mph|hrs?|hours?|mins?|minutes?|days?|weeks?|months?|years?|x)\b/gi) || []).length
    const specifics = currency + units
    checks.push(mkCheck('concrete-specifics', '具体数据点（货币 / 单位）', 8,
      specifics >= 3 ? 'pass' : specifics >= 1 ? 'partial' : 'fail',
      { detail: `${specifics} concrete data point(s)`,
        fix: specifics < 3 ? 'Use concrete units and amounts instead of vague descriptors' : undefined },
    ))

    return buildDimension(META, checks)
  },
}

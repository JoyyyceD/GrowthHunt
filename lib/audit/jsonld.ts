/** JSON-LD structured-data extraction shared by the schema & freshness dimensions. */
import type { CheerioAPI } from 'cheerio'

export interface JsonLdData {
  /** number of <script type="application/ld+json"> tags */
  blocks: number
  /** blocks that failed to JSON.parse */
  parseErrors: number
  /** every object node carrying an @type, flattened across @graph/arrays */
  nodes: Record<string, unknown>[]
  /** all @type values, lowercased */
  types: string[]
}

function collectNodes(value: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const v of value) collectNodes(v, out)
    return
  }
  if (!value || typeof value !== 'object') return
  const obj = value as Record<string, unknown>
  if ('@graph' in obj) collectNodes(obj['@graph'], out)
  if ('@type' in obj) out.push(obj)
  for (const key of Object.keys(obj)) {
    if (key === '@graph') continue
    const v = obj[key]
    if (v && typeof v === 'object') collectNodes(v, out)
  }
}

export function extractJsonLd($: CheerioAPI): JsonLdData {
  const nodes: Record<string, unknown>[] = []
  let blocks = 0
  let parseErrors = 0

  $('script[type="application/ld+json"]').each((_, el) => {
    blocks++
    const raw = $(el).contents().text().trim()
    if (!raw) { parseErrors++; return }
    try {
      collectNodes(JSON.parse(raw), nodes)
    } catch {
      parseErrors++
    }
  })

  const types: string[] = []
  for (const node of nodes) {
    const t = node['@type']
    if (typeof t === 'string') types.push(t.toLowerCase())
    else if (Array.isArray(t)) {
      for (const x of t) if (typeof x === 'string') types.push(x.toLowerCase())
    }
  }
  return { blocks, parseErrors, nodes, types }
}

/** Recursively pull the first string value for any of the given keys. */
export function findStringValue(nodes: Record<string, unknown>[], keys: string[]): string | null {
  for (const node of nodes) {
    for (const key of keys) {
      const v = node[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return null
}

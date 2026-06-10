import { describe, expect, test } from 'bun:test'
import { discoverKeyPages, extractJsonObject, researchQueries } from './intel'
import type { PageRead } from './research'

function page(url: string, markdown: string): PageRead {
  return { url, title: 'T', markdown, source: 'jina' }
}

describe('discoverKeyPages', () => {
  test('picks same-site pricing/about/product links, capped at 3', () => {
    const md = `
[Pricing](https://acme.com/pricing) [About us](https://acme.com/about)
[Features](https://acme.com/features) [How it works](https://acme.com/how-it-works)
[Blog](https://acme.com/blog) [Twitter](https://twitter.com/acme)
[Pricing update](https://acme.com/blog/pricing-update)
`
    const urls = discoverKeyPages(page('https://acme.com', md))
    expect(urls).toHaveLength(3)
    expect(urls).toContain('https://acme.com/pricing')
    expect(urls).toContain('https://acme.com/about')
    expect(urls.every(u => u.startsWith('https://acme.com'))).toBe(true)
    // canonical /pricing wins over /blog/pricing-update
    expect(urls).not.toContain('https://acme.com/blog/pricing-update')
  })

  test('ignores external links and handles no matches', () => {
    const urls = discoverKeyPages(page('https://acme.com', '[Other](https://other.com/pricing) plain text'))
    expect(urls).toHaveLength(0)
  })
})

describe('extractJsonObject', () => {
  test('parses fenced json', () => {
    expect(extractJsonObject('Here:\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })
  test('parses bare object with surrounding prose', () => {
    expect(extractJsonObject('Result: {"a":{"b":2}} done')).toEqual({ a: { b: 2 } })
  })
  test('returns null on garbage', () => {
    expect(extractJsonObject('no json here')).toBeNull()
  })
})

describe('researchQueries', () => {
  test('builds 4 queries around name and category', () => {
    const qs = researchQueries('Acme', 'voice memoir platform')
    expect(qs).toHaveLength(4)
    expect(qs[0]).toBe('Acme alternatives')
  })
})

/**
 * Brand intelligence pipeline (onboarding-spec §2) — the synthesis step that
 * every doc generator consumes.
 *
 *   gatherIntel(url) = read homepage + 2-3 key subpages (Jina)
 *                    + 4 Serper research queries
 *                    → one model call → structured BrandIntelligence
 *
 * Structured output uses a forced tool call (native tool calling, validated
 * shape) with a tolerant JSON-from-text fallback for models that ignore
 * tool_choice.
 */
import { chatStream, SCOUT_MODEL } from './client'
import { readPage, webSearch, type PageRead, type SearchResponse } from './research'

export interface BrandIntelligence {
  product: {
    name: string
    url: string
    tagline?: string
    oneLiner: string
    category: string
    features: string[]
    pricing?: {
      model: 'one-time' | 'subscription' | 'freemium' | 'unknown'
      tiers: Array<{ name: string; price: string; includes: string }>
    }
  }
  brand: {
    logoUrl?: string
    palette: Array<{ hex: string; role: string }>
    toneWords: string[]
    sloganCandidates: string[]
    voiceObservations: string[]
  }
  audience: {
    segments: Array<{
      name: string
      ageRange?: string
      role: string
      jtbd: string
      pains: string[]
      channels: string[]
      buyingSignals: string[]
    }>
  }
  market: {
    whyNow: Array<{ driver: string; evidence: string }>
    dataPoints: Array<{ claim: string; source: string; url?: string; year?: string }>
  }
  competitors: Array<{
    name: string
    url?: string
    format: string
    pricing?: string
    strengths: string[]
    gaps: string[]
    vsUs: string
  }>
  confidence: {
    scrape: number
    search: number
    notes: string[]
  }
}

export interface GatherResult {
  intel: BrandIntelligence
  pages: PageRead[]
  searches: Array<{ q: string; r: SearchResponse }>
}

const KEY_PAGE_PATTERNS = /\b(pricing|plans|about|product|features|how[- ]it[- ]works)\b/i
const MAX_SUBPAGES = 3

/** Pull same-site links from Jina markdown and pick the most informative subpages. */
export function discoverKeyPages(homepage: PageRead): string[] {
  const origin = (() => {
    try {
      return new URL(homepage.url).origin
    } catch {
      return ''
    }
  })()
  if (!origin) return []
  const found = new Map<string, number>()
  const linkRe = /\]\((https?:\/\/[^)\s]+)\)/g
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(homepage.markdown))) {
    const href = m[1].split('#')[0].replace(/\/+$/, '')
    if (!href.startsWith(origin)) continue
    if (href === origin) continue
    const path = href.slice(origin.length)
    if (!KEY_PAGE_PATTERNS.test(path)) continue
    // prefer shorter, more canonical paths (e.g. /pricing over /blog/pricing-update)
    const score = path.split('/').filter(Boolean).length
    if (!found.has(href) || found.get(href)! > score) found.set(href, score)
  }
  return [...found.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, MAX_SUBPAGES)
    .map(([href]) => href)
}

export function researchQueries(productName: string, category: string): string[] {
  return [
    `${productName} alternatives`,
    `${productName} reviews pricing`,
    `${category} market size growth`,
    `best ${category} tools 2026`,
  ]
}

/** Parse forced-tool-call arguments with brace-slice fallback (models
 * occasionally emit almost-JSON on very large schemas). */
export function parseToolArgs(args: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(args)
    return typeof v === 'object' && v !== null ? v : null
  } catch {
    return extractJsonObject(args)
  }
}

/** Tolerant JSON extraction for fallback paths. */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates = [fenced?.[1], text]
  for (const c of candidates) {
    if (!c) continue
    const start = c.indexOf('{')
    const end = c.lastIndexOf('}')
    if (start < 0 || end <= start) continue
    try {
      return JSON.parse(c.slice(start, end + 1))
    } catch {
      continue
    }
  }
  return null
}

const INTEL_TOOL = {
  name: 'submit_brand_intelligence',
  description: 'Submit the structured brand intelligence extracted from the research material.',
  parameters: {
    type: 'object',
    properties: {
      product: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          url: { type: 'string' },
          tagline: { type: 'string' },
          oneLiner: { type: 'string', description: '<= 25 words' },
          category: { type: 'string', description: "e.g. 'voice-first memoir platform'" },
          features: { type: 'array', items: { type: 'string' } },
          pricing: {
            type: 'object',
            properties: {
              model: { type: 'string', enum: ['one-time', 'subscription', 'freemium', 'unknown'] },
              tiers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { name: { type: 'string' }, price: { type: 'string' }, includes: { type: 'string' } },
                  required: ['name', 'price', 'includes'],
                },
              },
            },
            required: ['model', 'tiers'],
          },
        },
        required: ['name', 'url', 'oneLiner', 'category', 'features'],
      },
      brand: {
        type: 'object',
        properties: {
          palette: { type: 'array', items: { type: 'object', properties: { hex: { type: 'string' }, role: { type: 'string' } }, required: ['hex', 'role'] } },
          toneWords: { type: 'array', items: { type: 'string' } },
          sloganCandidates: { type: 'array', items: { type: 'string' }, description: 'verbatim slogans/headlines from the site' },
          voiceObservations: { type: 'array', items: { type: 'string' }, description: "e.g. 'short sentences, no exclamation marks'" },
        },
        required: ['palette', 'toneWords', 'sloganCandidates', 'voiceObservations'],
      },
      audience: {
        type: 'object',
        properties: {
          segments: {
            type: 'array',
            description: '2-3 segments, most important first',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                ageRange: { type: 'string' },
                role: { type: 'string' },
                jtbd: { type: 'string' },
                pains: { type: 'array', items: { type: 'string' } },
                channels: { type: 'array', items: { type: 'string' } },
                buyingSignals: { type: 'array', items: { type: 'string' } },
              },
              required: ['name', 'role', 'jtbd', 'pains', 'channels', 'buyingSignals'],
            },
          },
        },
        required: ['segments'],
      },
      market: {
        type: 'object',
        properties: {
          whyNow: { type: 'array', items: { type: 'object', properties: { driver: { type: 'string' }, evidence: { type: 'string' } }, required: ['driver', 'evidence'] } },
          dataPoints: {
            type: 'array',
            description: 'ONLY claims present in the search results. Never invent numbers.',
            items: {
              type: 'object',
              properties: { claim: { type: 'string' }, source: { type: 'string' }, url: { type: 'string' }, year: { type: 'string' } },
              required: ['claim', 'source'],
            },
          },
        },
        required: ['whyNow', 'dataPoints'],
      },
      competitors: {
        type: 'array',
        description: '3-6 competitors found in the research',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            url: { type: 'string' },
            format: { type: 'string' },
            pricing: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            gaps: { type: 'array', items: { type: 'string' } },
            vsUs: { type: 'string' },
          },
          required: ['name', 'format', 'strengths', 'gaps', 'vsUs'],
        },
      },
      confidence: {
        type: 'object',
        properties: {
          scrape: { type: 'number', description: '0-1: how informative the site content was' },
          search: { type: 'number', description: '0-1: how useful the search results were' },
          notes: { type: 'array', items: { type: 'string' } },
        },
        required: ['scrape', 'search', 'notes'],
      },
    },
    required: ['product', 'brand', 'audience', 'market', 'competitors', 'confidence'],
  },
}

/** A parseable blob isn't necessarily the right shape — a string where an
 * object belongs would make normalization throw ("assign to readonly"). */
function isValidIntelShape(raw: Record<string, unknown>): boolean {
  const audience = raw.audience as Record<string, unknown> | undefined
  return (
    typeof raw.product === 'object' && raw.product !== null &&
    typeof audience === 'object' && audience !== null &&
    Array.isArray(audience.segments) &&
    Array.isArray(raw.competitors)
  )
}

export interface GatherOptions {
  brief?: string
  workspaceId?: string | null
  model?: string
  onStage?: (stage: 'scraping' | 'researching' | 'synthesizing', detail: string) => void
}

export async function gatherIntel(url: string, opts: GatherOptions = {}): Promise<GatherResult> {
  const onStage = opts.onStage || (() => {})

  onStage('scraping', url)
  // One retry: transient aborts (dev-server compile storms, flaky upstream)
  // shouldn't kill a whole onboarding at its very first step.
  let homepage: PageRead
  try {
    homepage = await readPage(url)
  } catch {
    await new Promise(r => setTimeout(r, 2000))
    homepage = await readPage(url)
  }
  const subUrls = discoverKeyPages(homepage)
  const subpages = (await Promise.allSettled(subUrls.map(u => readPage(u))))
    .filter((r): r is PromiseFulfilledResult<PageRead> => r.status === 'fulfilled')
    .map(r => r.value)
  const pages = [homepage, ...subpages]

  // Tiny pre-call: extract real name + category so research queries make sense
  // ("best voice memoir platforms" instead of "best EverMemory tools").
  const fallbackName = homepage.title.split(/[|·—-]/)[0]?.trim() || new URL(homepage.url).hostname
  let name = fallbackName
  let category = fallbackName
  try {
    const pre = await chatStream({
      model: opts.model || SCOUT_MODEL,
      workspaceId: opts.workspaceId ?? null,
      kind: 'onboarding-categorize',
      maxTokens: 1200,
      temperature: 0,
      stream: false,
      tools: [{
        name: 'submit_category',
        description: 'Submit the product name and category.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'product name' },
            category: { type: 'string', description: "2-5 word product category, e.g. 'voice-first memoir platform'" },
          },
          required: ['name', 'category'],
        },
      }],
      messages: [
        { role: 'system', content: 'Identify the product name and a 2-5 word category from this homepage. Call submit_category.' },
        { role: 'user', content: homepage.markdown.slice(0, 4000) },
      ],
    })
    const call = pre.toolCalls.find(c => c.name === 'submit_category')
    if (call) {
      const parsed = JSON.parse(call.arguments) as { name?: string; category?: string }
      if (parsed.name) name = parsed.name
      if (parsed.category) category = parsed.category
    }
  } catch {
    // fall back to title guess
  }
  onStage('researching', `${name} (${category})`)
  const queries = researchQueries(name, category)
  const searches: Array<{ q: string; r: SearchResponse }> = []
  for (const q of queries) {
    try {
      searches.push({ q, r: await webSearch(q, 5) })
    } catch (e) {
      searches.push({ q, r: { results: [] } })
    }
  }

  onStage('synthesizing', '')
  const buildMaterial = (pageCap: number) =>
    [
      `# Target site: ${url}`,
      opts.brief ? `# User brief: ${opts.brief}` : null,
      ...pages.map(p => `## PAGE ${p.url} (via ${p.source})\n${p.markdown.slice(0, pageCap)}`),
      ...searches.map(s =>
        `## SEARCH "${s.q}"\n${s.r.answerBox ? `Answer box: ${s.r.answerBox}\n` : ''}${s.r.results
          .map(r => `- ${r.title} (${r.link}): ${r.snippet}`)
          .join('\n')}`,
      ),
    ]
      .filter(Boolean)
      .join('\n\n')

  // Free-tier providers sometimes drop large requests on the floor (keep-alives,
  // then an empty stream). Retry with progressively trimmed material.
  const attempts: Array<{ pageCap: number; maxTokens: number }> = [
    { pageCap: 12_000, maxTokens: 12_000 },
    { pageCap: 6_000, maxTokens: 8_000 },
    { pageCap: 3_000, maxTokens: 8_000 },
  ]
  let raw: Record<string, unknown> | null = null
  let lastDiag = ''
  for (const attempt of attempts) {
    const result = await chatStream({
      model: opts.model || SCOUT_MODEL,
      workspaceId: opts.workspaceId ?? null,
      kind: 'onboarding-intel',
      // Reasoning models spend a hidden thinking budget before the tool call;
      // synthesis needs real headroom or the arguments get truncated.
      maxTokens: attempt.maxTokens,
      temperature: 0.2,
      stream: false,
      tools: [INTEL_TOOL],
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous brand researcher. Extract structured intelligence from the material by calling submit_brand_intelligence. Hard rules: market dataPoints may ONLY contain claims that literally appear in the SEARCH sections (with their source); if none qualify, return an empty array. Palette hexes only if visible in the material, else []. Slogans must be verbatim from the site.',
        },
        { role: 'user', content: buildMaterial(attempt.pageCap) },
      ],
    }).catch(e => {
      lastDiag = (e as Error).message
      return null
    })
    if (!result) continue
    const call = result.toolCalls.find(c => c.name === 'submit_brand_intelligence')
    if (call) raw = parseToolArgs(call.arguments)
    if (!raw) raw = extractJsonObject(result.content)
    if (raw && !isValidIntelShape(raw)) {
      lastDiag = 'malformed shape (e.g. product not an object)'
      raw = null
    }
    // Repair pass: big-schema tool args occasionally come back as almost-JSON
    // (unescaped quote/newline). One cheap fix-it call recovers most of them.
    if (!raw && call && call.arguments.length > 500) {
      const repaired = await chatStream({
        model: opts.model || SCOUT_MODEL,
        workspaceId: opts.workspaceId ?? null,
        kind: 'onboarding-intel-repair',
        maxTokens: attempt.maxTokens,
        temperature: 0,
        stream: false,
        tools: [INTEL_TOOL],
        messages: [
          { role: 'system', content: 'The following tool-call arguments are malformed JSON. Re-submit the SAME content as valid arguments via submit_brand_intelligence. Fix syntax only — do not change any facts.' },
          { role: 'user', content: call.arguments.slice(0, 30_000) },
        ],
      }).catch(() => null)
      const fixed = repaired?.toolCalls.find(c => c.name === 'submit_brand_intelligence')
      if (fixed) {
        raw = parseToolArgs(fixed.arguments)
        if (raw && !isValidIntelShape(raw)) raw = null
      }
    }
    if (raw) break
    const argsHead = result.toolCalls[0]?.arguments?.slice(0, 160) || ''
    lastDiag = `finish=${result.finishReason}, toolCalls=${result.toolCalls.length}, content=${result.content.length}ch, args=${JSON.stringify(argsHead)}`
    console.error(`[scout] intel synthesis attempt failed (pageCap=${attempt.pageCap}): ${lastDiag}`)
    onStage('synthesizing', `retrying smaller (${lastDiag})`)
  }
  if (!raw) {
    throw new Error(`Brand intelligence synthesis returned no parseable result (${lastDiag})`)
  }

  const intel = raw as unknown as BrandIntelligence
  intel.product = intel.product || ({} as BrandIntelligence['product'])
  intel.product.url = intel.product.url || url
  intel.confidence = intel.confidence || { scrape: 0.5, search: 0.5, notes: [] }
  // Thin homepage content is the strongest signal we have for the fallback flow.
  if ((homepage.markdown || '').length < 500) {
    intel.confidence.scrape = Math.min(intel.confidence.scrape, 0.3)
    intel.confidence.notes.push('Homepage content under 500 chars — consider the manual brief flow')
  }
  return { intel, pages, searches }
}

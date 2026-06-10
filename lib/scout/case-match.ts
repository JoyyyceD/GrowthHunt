/**
 * Case engine (V2-T0a, differentiation 6.1) — match the user's brand against
 * the Growth Story library (29 real, sourced growth cases) and produce
 * caseNotes for the social-strategy / first-week-calendar generators.
 *
 * Honest-match rule: if nothing fits, return nothing — a forced precedent
 * reads worse than none (build-plan T14 AC).
 */
import { getAllCompanies, getStory } from '@/lib/growth-story'
import { chatStream, SCOUT_MODEL } from './client'
import { parseToolArgs } from './intel'
import type { BrandIntelligence } from './intel'

export interface CaseMatch {
  slug: string
  name: string
  lesson: string
  topPlays: string[]
}

interface CatalogEntry {
  slug: string
  name: string
  tagline: string
  summary: string
  platforms: Array<{ name: string; score: number; role: string }>
}

let catalogCache: CatalogEntry[] | null = null

/** Compact catalog of all growth stories (filesystem read, cached per process). */
export function caseCatalog(): CatalogEntry[] {
  if (catalogCache) return catalogCache
  const entries: CatalogEntry[] = []
  for (const slug of getAllCompanies()) {
    const story = getStory(slug)
    if (!story) continue
    const company = story.timeline.company
    entries.push({
      slug,
      name: company.name,
      tagline: company.tagline || '',
      summary: (company.summary || story.description || '').slice(0, 280),
      platforms: (story.timeline.platforms || [])
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(p => ({ name: p.name, score: p.score, role: p.role })),
    })
  }
  catalogCache = entries
  return entries
}

/** Pick 0-2 genuinely applicable cases for this brand. */
export async function matchCases(
  intel: BrandIntelligence,
  workspaceId?: string | null,
  model?: string,
): Promise<CaseMatch[]> {
  const catalog = caseCatalog()
  if (!catalog.length) return []

  const brandBrief = [
    `Product: ${intel.product.name} — ${intel.product.oneLiner}`,
    `Category: ${intel.product.category}`,
    `Audience: ${intel.audience.segments.map(s => `${s.name} (${s.role}; channels: ${s.channels.join(', ')})`).join(' | ')}`,
  ].join('\n')

  const result = await chatStream({
    model: model || SCOUT_MODEL,
    workspaceId: workspaceId ?? null,
    kind: 'case-match',
    maxTokens: 1500,
    temperature: 0.1,
    stream: false,
    tools: [{
      name: 'submit_matches',
      description: 'Submit the matching growth cases (empty array if none genuinely apply).',
      parameters: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            description: '0-2 cases. Only include a case if its growth situation genuinely parallels this brand (similar audience type, channel fit, or go-to-market shape). A forced match is worse than none.',
            items: {
              type: 'object',
              properties: {
                slug: { type: 'string', description: 'exact slug from the catalog' },
                lesson: { type: 'string', description: '1-2 sentences: what this case proves that applies to THIS brand specifically' },
              },
              required: ['slug', 'lesson'],
            },
          },
        },
        required: ['matches'],
      },
    }],
    messages: [
      {
        role: 'system',
        content: 'You match a brand against a library of real startup growth cases. Be strict: only match when the parallel is genuine. Call submit_matches.',
      },
      {
        role: 'user',
        content: `BRAND:\n${brandBrief}\n\nCASE LIBRARY:\n${catalog
          .map(c => `- ${c.slug}: ${c.name} — ${c.tagline}. ${c.summary} Top channels: ${c.platforms.map(p => `${p.name}(${p.score})`).join(', ')}`)
          .join('\n')}`,
      },
    ],
  })

  const call = result.toolCalls.find(c => c.name === 'submit_matches')
  if (!call) return []
  const parsed = parseToolArgs(call.arguments) as { matches?: Array<{ slug: string; lesson: string }> } | null
  const bySlug = new Map(catalog.map(c => [c.slug, c]))
  return (parsed?.matches || [])
    .filter(m => m.slug && m.lesson && bySlug.has(m.slug))
    .slice(0, 2)
    .map(m => {
      const c = bySlug.get(m.slug)!
      return {
        slug: c.slug,
        name: c.name,
        lesson: m.lesson,
        topPlays: c.platforms.map(p => `${p.name}: ${p.role}`),
      }
    })
}

/** Render matches into the caseNotes block consumed by the doc generators. */
export function buildCaseNotes(matches: CaseMatch[]): string | undefined {
  if (!matches.length) return undefined
  return matches
    .map(m =>
      `- ${m.name} (real sourced case, link as [${m.name} playbook](/growth-story/${m.slug})): ${m.lesson} Their highest-leverage channels: ${m.topPlays.join('; ')}.`,
    )
    .join('\n')
}

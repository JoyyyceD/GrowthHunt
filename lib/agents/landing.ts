/**
 * Landing Page Doctor.
 *
 * 6 conversion-focused dimensions, each scored 0-100 by the LLM with a
 * concrete rewrite suggestion. Distinct from the GEO audit (which is about
 * AI citations); this is about humans converting.
 *
 *   1. Above-the-fold clarity     — does the H1 + sub explain WHO + WHAT in 5s
 *   2. CTA strength               — is the primary action obvious, specific, low-friction
 *   3. Value proposition          — concrete outcome, not feature list
 *   4. Social proof               — testimonials, logos, numbers, integrations
 *   5. Friction & objections      — does it pre-empt the "but…" questions
 *   6. Copy specificity           — concrete numbers/units vs vague hype
 */
import { fetchPageSnapshot, type PageSnapshot } from './page-fetch'
import { callAgent, extractJson, workspaceContext, withVoice } from './llm'
import type { Workspace } from '@/lib/workspace/types'

export const LANDING_DIMENSIONS = [
  { id: 'above-fold', label: 'Above-the-fold clarity', why: 'WHO + WHAT must be obvious in 5s.' },
  { id: 'cta', label: 'CTA strength', why: 'Primary action specific, low-friction, visually dominant.' },
  { id: 'value', label: 'Value proposition', why: 'Concrete outcome and unfair advantage, not feature list.' },
  { id: 'proof', label: 'Social proof', why: 'Testimonials, logos, usage numbers, real names.' },
  { id: 'friction', label: 'Friction & objections', why: 'Pre-empts "but what about…" doubts up-front.' },
  { id: 'specificity', label: 'Copy specificity', why: 'Specific numbers / units / scenarios, not hype.' },
] as const

export type DimensionId = typeof LANDING_DIMENSIONS[number]['id']

export interface LandingDimension {
  id: DimensionId
  label: string
  score: number               // 0..100
  finding: string             // what we observed
  suggestion: string          // what to do
  rewrite?: string            // optional copy paste-ready
}

export interface LandingReport {
  url: string
  overall_score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  fetched_at: string
  status: number
  notice?: string
  dimensions: LandingDimension[]
  hero_rewrite?: { h1: string; subhead: string; cta: string }
  next_steps: string[]
}

function grade(score: number): LandingReport['grade'] {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

interface RawLanding {
  dimensions?: Array<{ id?: string; score?: number; finding?: string; suggestion?: string; rewrite?: string }>
  hero_rewrite?: { h1?: string; subhead?: string; cta?: string }
  next_steps?: string[]
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function emptyReport(url: string, snap: PageSnapshot | null, notice: string): LandingReport {
  return {
    url,
    overall_score: 0,
    grade: 'F',
    fetched_at: snap?.fetchedAt ?? new Date().toISOString(),
    status: snap?.status ?? 0,
    notice,
    dimensions: LANDING_DIMENSIONS.map((d) => ({ id: d.id, label: d.label, score: 0, finding: notice, suggestion: '' })),
    next_steps: [],
  }
}

export async function runLandingDoctor(input: { workspace: Workspace; url?: string }): Promise<LandingReport> {
  const targetUrl = (input.url || input.workspace.url).trim()
  let snap: PageSnapshot
  try {
    snap = await fetchPageSnapshot(targetUrl)
  } catch (err) {
    return emptyReport(targetUrl, null, `Could not fetch the page: ${(err as Error).message}`)
  }
  if (snap.status >= 400) {
    return emptyReport(targetUrl, snap, `Page returned HTTP ${snap.status}.`)
  }
  if (!snap.text || snap.text.length < 80) {
    return emptyReport(targetUrl, snap, 'Page rendered too little text to analyze (likely JS-only SPA).')
  }

  const system = withVoice(
    'You are a senior landing-page conversion auditor. You read like a marketer '
    + 'who has shipped hundreds of landing pages — sharp, opinionated, never '
    + 'generic. You score 6 dimensions 0-100, write findings in 1-2 sentences, '
    + 'and suggest concrete edits (not platitudes). When you propose a rewrite, '
    + 'it must be ready to paste. Reply with ONLY a JSON object.',
    input.workspace.voice,
  )

  const ctx = workspaceContext(input.workspace)
  const dimensionList = LANDING_DIMENSIONS.map((d) => `  - ${d.id}: ${d.label} — ${d.why}`).join('\n')

  const user = [
    `WORKSPACE CONTEXT:\n${ctx}`,
    '',
    'PAGE SNAPSHOT:',
    `URL: ${snap.url}`,
    `Title: ${snap.title}`,
    `H1: ${snap.h1}`,
    `Meta: ${snap.description}`,
    `Headings (h1-h3): ${snap.headings.slice(0, 16).join(' | ')}`,
    `Body text (first 3k chars):\n${snap.text}`,
    '',
    'DIMENSIONS:',
    dimensionList,
    '',
    'Return JSON exactly:',
    '{',
    '  "dimensions": [',
    '    {"id": "above-fold", "score": 0-100, "finding": "<1-2 sentences>", "suggestion": "<concrete edit>", "rewrite": "<optional paste-ready copy>"},',
    '    ...one per dimension above',
    '  ],',
    '  "hero_rewrite": {"h1": "<sharper H1>", "subhead": "<one-sentence value prop>", "cta": "<button text + microcopy>"},',
    '  "next_steps": ["<3-5 prioritized actions>"]',
    '}',
    '',
    'Be opinionated. If a dimension is already strong, score it 80+ and say so briefly. Skip platitudes.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 2400, temperature: 0.4 })
  const parsed = extractJson<RawLanding>(raw)

  if (!parsed || !Array.isArray(parsed.dimensions)) {
    return emptyReport(targetUrl, snap, 'Landing agent unavailable — set MINIMAX_API_KEY to enable.')
  }

  const dims: LandingDimension[] = LANDING_DIMENSIONS.map((meta) => {
    const r = parsed.dimensions!.find((x) => x.id === meta.id)
    return {
      id: meta.id,
      label: meta.label,
      score: clamp(Math.round(Number(r?.score) || 0), 0, 100),
      finding: (r?.finding || '').slice(0, 500),
      suggestion: (r?.suggestion || '').slice(0, 500),
      rewrite: r?.rewrite ? String(r.rewrite).slice(0, 1000) : undefined,
    }
  })

  const overall_score = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length)

  return {
    url: snap.url,
    overall_score,
    grade: grade(overall_score),
    fetched_at: snap.fetchedAt,
    status: snap.status,
    dimensions: dims,
    hero_rewrite: parsed.hero_rewrite
      ? {
          h1: String(parsed.hero_rewrite.h1 || '').slice(0, 200),
          subhead: String(parsed.hero_rewrite.subhead || '').slice(0, 300),
          cta: String(parsed.hero_rewrite.cta || '').slice(0, 120),
        }
      : undefined,
    next_steps: (parsed.next_steps || [])
      .filter((x): x is string => typeof x === 'string')
      .slice(0, 6),
  }
}

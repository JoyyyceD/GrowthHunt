/**
 * Competitor Watch.
 *
 * For each competitor URL on a workspace, periodically snapshot the page,
 * compare with the prior snapshot, and surface notable diffs:
 *   - copy change       (substantive text rewrite in body/headline)
 *   - pricing change    (heuristically extracted pricing block diff)
 *   - new section       (h2/h3 appeared that wasn't there)
 *
 * "Estimated ARR" is deliberately NOT computed — there's no honest way to
 * derive it without proprietary data feeds, and surfacing a fake number is
 * worse than leaving it out.
 */
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPageSnapshot } from './page-fetch'
import { callAgent, extractJson } from './llm'
import type { Workspace } from '@/lib/workspace/types'

export interface CompetitorSnapshot {
  id: string
  workspace_id: string
  competitor_url: string
  url_hash: string
  title: string | null
  description: string | null
  body_excerpt: string | null
  pricing_block: string | null
  hash: string
  created_at: string
}

export interface CompetitorDiff {
  id: string
  workspace_id: string
  competitor_url: string
  kind: 'pricing' | 'copy' | 'headline' | 'new_section'
  summary: string
  before_excerpt: string | null
  after_excerpt: string | null
  detected_at: string
  acknowledged: boolean
}

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32)
}

function bodyHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 32)
}

/** Heuristic: find the section that mentions "pricing|plan|tier" + a $ figure. */
function extractPricingBlock(text: string): string | null {
  if (!text) return null
  const paragraphs = text.split(/(?<=[.!?])\s+(?=[A-Z])/).slice(0, 80)
  const scored: Array<{ p: string; score: number }> = []
  for (const p of paragraphs) {
    if (p.length < 30 || p.length > 800) continue
    let score = 0
    if (/\bpricing\b|\bplan(s)?\b|\btier(s)?\b|\bper month\b|\bper year\b|\bbilled\b/i.test(p)) score += 2
    const dollars = (p.match(/\$\d+(\.\d+)?/g) || []).length
    score += Math.min(3, dollars)
    if (/(free|trial|starter|pro|enterprise|team)/i.test(p)) score += 1
    if (score >= 3) scored.push({ p, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 3).map((s) => s.p).join(' ').slice(0, 1500) || null
}

interface DiffRawResponse {
  diffs?: Array<{ kind?: string; summary?: string; before?: string; after?: string }>
}

const VALID_KINDS = new Set<CompetitorDiff['kind']>(['pricing', 'copy', 'headline', 'new_section'])

async function diffPrompted(competitorUrl: string, prev: CompetitorSnapshot, curr: { title: string; description: string; body_excerpt: string; pricing_block: string | null }): Promise<Array<{ kind: CompetitorDiff['kind']; summary: string; before: string | null; after: string | null }>> {
  if (!process.env.MINIMAX_API_KEY) return []
  const system =
    'You are a competitor-watch analyst. Given a competitor product page\'s '
    + 'previous and current snapshots, list the meaningful changes — pricing, '
    + 'headline rewrites, new sections, repositioning. Skip cosmetic edits '
    + '(typos, single-word changes). Reply with ONLY a JSON object.'
  const user = [
    `Competitor URL: ${competitorUrl}`,
    '',
    'PREVIOUS SNAPSHOT:',
    `Title: ${prev.title || ''}`,
    `Meta: ${prev.description || ''}`,
    `Pricing: ${prev.pricing_block || '(none detected)'}`,
    `Body excerpt:\n${(prev.body_excerpt || '').slice(0, 1500)}`,
    '',
    'CURRENT SNAPSHOT:',
    `Title: ${curr.title}`,
    `Meta: ${curr.description}`,
    `Pricing: ${curr.pricing_block || '(none detected)'}`,
    `Body excerpt:\n${curr.body_excerpt.slice(0, 1500)}`,
    '',
    'Return JSON exactly:',
    '{',
    '  "diffs": [',
    '    {"kind": "pricing | copy | headline | new_section", "summary": "<1-2 sentences>", "before": "<short snippet>", "after": "<short snippet>"}',
    '  ]',
    '}',
    '',
    'Include 0 diffs if nothing material changed. Each summary should be actionable to the founder.',
  ].join('\n')
  const raw = await callAgent({ system, user, maxTokens: 1200, temperature: 0.3 })
  const parsed = extractJson<DiffRawResponse>(raw)
  if (!parsed?.diffs) return []
  return parsed.diffs
    .filter((d) => VALID_KINDS.has(d.kind as CompetitorDiff['kind']))
    .map((d) => ({
      kind: d.kind as CompetitorDiff['kind'],
      summary: String(d.summary || '').slice(0, 400),
      before: d.before ? String(d.before).slice(0, 400) : null,
      after: d.after ? String(d.after).slice(0, 400) : null,
    }))
    .filter((d) => d.summary)
}

export interface WatchRunInput {
  workspace: Workspace
  /** When false, only snapshot — don't diff. Useful for the very first run. */
  diff?: boolean
}

export interface WatchRunOutput {
  competitors: number
  snapshots: number
  diffs: number
  errors: number
  notes: string
}

async function getLatestSnapshot(workspaceId: string, urlHashVal: string): Promise<CompetitorSnapshot | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('competitor_snapshots')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('url_hash', urlHashVal)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as CompetitorSnapshot) || null
}

export async function runCompetitorWatch(input: WatchRunInput): Promise<WatchRunOutput> {
  const ws = input.workspace
  const urls = (ws.competitors || []).map((c) => c.url).filter((u): u is string => !!u && /^https?:\/\//i.test(u))
  if (urls.length === 0) {
    return { competitors: 0, snapshots: 0, diffs: 0, errors: 0, notes: 'No competitor URLs on this workspace. Add them on /workspace/[id].' }
  }

  let snapshots = 0
  let diffs = 0
  let errors = 0
  const admin = createAdminClient()

  for (const url of urls) {
    try {
      const snap = await fetchPageSnapshot(url)
      if (snap.status >= 400 || !snap.text) {
        errors += 1
        continue
      }
      const body_excerpt = snap.text.slice(0, 3000)
      const pricing_block = extractPricingBlock(snap.text)
      const hash = bodyHash(body_excerpt + '|' + (pricing_block || ''))

      const prev = await getLatestSnapshot(ws.id, urlHash(url))
      if (prev && prev.hash === hash) continue   // identical page, skip insert

      const { data: inserted } = await admin
        .from('competitor_snapshots')
        .insert({
          workspace_id: ws.id,
          competitor_url: url,
          url_hash: urlHash(url),
          title: snap.title,
          description: snap.description,
          body_excerpt,
          pricing_block,
          hash,
        })
        .select('*')
        .single()
      if (!inserted) continue
      snapshots += 1

      if (input.diff !== false && prev) {
        const detected = await diffPrompted(url, prev, {
          title: snap.title,
          description: snap.description,
          body_excerpt,
          pricing_block,
        })
        if (detected.length > 0) {
          const { error } = await admin.from('competitor_diffs').insert(detected.map((d) => ({
            workspace_id: ws.id,
            competitor_url: url,
            kind: d.kind,
            summary: d.summary,
            before_excerpt: d.before,
            after_excerpt: d.after,
          })))
          if (!error) diffs += detected.length
        }
      }
    } catch (err) {
      console.error(`[competitor] ${url} failed:`, (err as Error).message)
      errors += 1
    }
  }

  return {
    competitors: urls.length,
    snapshots,
    diffs,
    errors,
    notes: snapshots === 0 ? 'No content changes detected.' : `${snapshots} fresh snapshot(s), ${diffs} change(s).`,
  }
}

export async function listSnapshots(workspaceId: string): Promise<CompetitorSnapshot[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('competitor_snapshots')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(60)
  return (data as CompetitorSnapshot[]) || []
}

export async function listDiffs(workspaceId: string): Promise<CompetitorDiff[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('competitor_diffs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('detected_at', { ascending: false })
    .limit(80)
  return (data as CompetitorDiff[]) || []
}

/**
 * ICP / Positioning Agent.
 *
 * Reads the workspace + a snapshot of the product's homepage, asks the
 * model to produce: ICP summary, 2-4 ICP segments, a one-paragraph
 * positioning statement, 3-5 key messages, 2-5 likely competitors.
 *
 * Result is returned to the caller — the route then patches the workspace.
 */
import { fetchPageSnapshot } from './page-fetch'
import { callAgent, extractJson } from './llm'
import type { Workspace, IcpSegment, CompetitorRef } from '@/lib/workspace/types'

export interface IcpRunInput {
  workspace: Workspace
  /** Free-form extra context the user typed before running. */
  brief?: string
}

export interface IcpRunOutput {
  icp_summary: string
  icp_segments: IcpSegment[]
  positioning: string
  key_messages: string[]
  competitors: CompetitorRef[]
  notes: string
}

interface RawOutput {
  icp_summary?: string
  icp_segments?: Array<Partial<IcpSegment>>
  positioning?: string
  key_messages?: string[]
  competitors?: Array<Partial<CompetitorRef>>
  notes?: string
}

export async function runIcpAgent(input: IcpRunInput): Promise<IcpRunOutput> {
  const ws = input.workspace
  let snap
  try {
    snap = await fetchPageSnapshot(ws.url)
  } catch {
    snap = null
  }

  const system =
    'You are an experienced go-to-market strategist. Given a product\'s homepage '
    + 'and the founder\'s brief, you produce a tight, actionable GTM brief: who '
    + 'the ICP is, what they\'re trying to do, how to position the product, what '
    + 'messages to lead with, and who the realistic competitors are. Be specific '
    + 'and resist generic marketing-speak. Reply with ONLY a JSON object.'

  const ctx: string[] = []
  ctx.push(`Product: ${ws.name}`)
  ctx.push(`URL: ${ws.url}`)
  if (ws.one_liner) ctx.push(`Current one-liner: ${ws.one_liner}`)
  if (ws.icp_summary) ctx.push(`Current ICP draft: ${ws.icp_summary}`)
  if (ws.positioning) ctx.push(`Current positioning draft: ${ws.positioning}`)
  if (input.brief) ctx.push(`\nFounder brief:\n${input.brief}`)
  if (snap) {
    ctx.push(`\nHomepage snapshot (${snap.url}, status ${snap.status}):`)
    if (snap.title) ctx.push(`Title: ${snap.title}`)
    if (snap.h1) ctx.push(`H1: ${snap.h1}`)
    if (snap.description) ctx.push(`Meta: ${snap.description}`)
    if (snap.headings.length) ctx.push(`Headings: ${snap.headings.slice(0, 12).join(' | ')}`)
    if (snap.text) ctx.push(`Body excerpt (3k chars max):\n${snap.text}`)
  }

  const user = [
    ctx.join('\n'),
    '',
    'Return JSON exactly:',
    '{',
    '  "icp_summary": "<2 sentences, who they are and what life-stage>",',
    '  "icp_segments": [',
    '    {"name": "<segment>", "jtbd": "<job to be done>", "pains": ["<pain1>", "<pain2>"], "channels": ["X", "Reddit"]}',
    '  ],',
    '  "positioning": "<one paragraph, fill-the-blank: For X, we are the Y that Z. Unlike A, we B.>",',
    '  "key_messages": ["<3-5 short messages — what to lead with>"],',
    '  "competitors": [{"name": "<brand>", "url": "<best-guess url or empty>", "note": "<why they compete>"}],',
    '  "notes": "<1-3 sentences of GTM advice the founder should hear right now>"',
    '}',
    '',
    'Constraints:',
    '- icp_segments: 2 to 4 entries, distinct',
    '- key_messages: 3 to 5 strings, each ≤ 14 words',
    '- competitors: 2 to 5 entries',
    '- positioning: ≤ 60 words, specific not generic',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 1600, temperature: 0.4 })
  const parsed = extractJson<RawOutput>(raw)

  if (!parsed) {
    return {
      icp_summary: ws.icp_summary || '',
      icp_segments: ws.icp_segments,
      positioning: ws.positioning || '',
      key_messages: ws.key_messages,
      competitors: ws.competitors,
      notes: 'Agent unavailable — set MINIMAX_API_KEY to enable the ICP/positioning agent.',
    }
  }

  return {
    icp_summary: (parsed.icp_summary || '').slice(0, 600),
    icp_segments: (parsed.icp_segments || []).slice(0, 4).map((s) => ({
      name: (s.name || '').slice(0, 80),
      jtbd: (s.jtbd || '').slice(0, 240),
      pains: (s.pains || []).filter((x): x is string => typeof x === 'string').slice(0, 5),
      channels: (s.channels || []).filter((x): x is string => typeof x === 'string').slice(0, 6),
    })).filter((s) => s.name),
    positioning: (parsed.positioning || '').slice(0, 800),
    key_messages: (parsed.key_messages || []).filter((x): x is string => typeof x === 'string').slice(0, 5),
    competitors: (parsed.competitors || []).slice(0, 5).map((c) => ({
      name: (c.name || '').slice(0, 80),
      url: c.url ? String(c.url).slice(0, 200) : undefined,
      note: c.note ? String(c.note).slice(0, 200) : undefined,
    })).filter((c) => c.name),
    notes: (parsed.notes || '').slice(0, 600),
  }
}

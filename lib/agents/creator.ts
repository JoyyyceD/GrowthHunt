/**
 * Creator Outreach Agent v1.
 *
 *   1. Pulls candidate creators from xhunter_accounts (followers ≤ MAX_FOLLOWERS,
 *      ordered by recency-weighted engagement) so we're targeting the
 *      "trustable mid-tier" tier the founder's buyers actually listen to.
 *   2. For each candidate, peeks their last few tweets to feed the scoring
 *      prompt with real context.
 *   3. LLM scores each creator 0-100 for "buyer-trust signal" against the
 *      workspace's ICP + positioning, with reasoning.
 *   4. LLM drafts a personalized X DM in the founder's voice — short,
 *      specific, references the creator's recent work.
 *   5. Drafts are inserted into outreach_drafts (status=queued). v1 is
 *      review-and-click-to-send; auto-send/scheduling is v2 (needs X auth).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson, workspaceContext, withVoice } from './llm'
import type { Workspace } from '@/lib/workspace/types'

export const MAX_FOLLOWERS = 10_000
const CANDIDATE_POOL = 50
const FINAL_PICKS = 12
const TWEETS_PER_CANDIDATE = 4

interface CreatorCandidate {
  handle: string
  display_name: string | null
  followers: number | null
  bio: string | null
  recent_tweets: string[]
}

interface ScoredCreator {
  candidate: CreatorCandidate
  audience_score: number
  reasoning: string
  message_body: string
}

interface DraftRow {
  workspace_id: string
  channel: string
  target_handle: string
  target_name: string | null
  target_url: string
  audience_score: number
  reasoning: string
  message_body: string
  status: string
}

async function pullCandidates(): Promise<CreatorCandidate[]> {
  const admin = createAdminClient()
  // Pull a pool of low-follower creators with recent activity.
  const { data: accounts, error } = await admin
    .from('xhunter_accounts')
    .select('handle, display_name, followers, bio')
    .lte('followers', MAX_FOLLOWERS)
    .gte('followers', 200)
    .order('followers', { ascending: false })
    .limit(CANDIDATE_POOL)
  if (error || !accounts || accounts.length === 0) {
    console.error('[creator] account pull failed:', error?.message)
    return []
  }

  const handles = (accounts as Array<{ handle: string }>).map((a) => a.handle)
  const { data: tweets } = await admin
    .from('xhunter_tweets')
    .select('handle, text, like_count, view_count, created_at_x')
    .in('handle', handles)
    .eq('is_rt', false)
    .order('created_at_x', { ascending: false })
    .limit(handles.length * TWEETS_PER_CANDIDATE)

  const byHandle = new Map<string, string[]>()
  for (const t of (tweets || []) as Array<{ handle: string; text: string }>) {
    const arr = byHandle.get(t.handle) || []
    if (arr.length < TWEETS_PER_CANDIDATE) {
      arr.push(String(t.text).replace(/\s+/g, ' ').trim())
      byHandle.set(t.handle, arr)
    }
  }

  return (accounts as Array<{
    handle: string; display_name: string | null; followers: number | null; bio: string | null
  }>).map((a) => ({
    handle: a.handle,
    display_name: a.display_name,
    followers: a.followers,
    bio: a.bio,
    recent_tweets: byHandle.get(a.handle) || [],
  })).filter((c) => c.recent_tweets.length >= 1)
}

interface ScoredRaw {
  scored?: Array<{ handle?: string; audience_score?: number; reasoning?: string; message_body?: string }>
}

export interface CreatorRunInput {
  workspace: Workspace
  /** Number of drafts to produce (default 12, capped). */
  picks?: number
  /** Free-form extra instructions from the user (optional). */
  notes?: string
}

export interface OutreachDraft {
  id: string
  handle: string
  display_name: string | null
  followers: number | null
  audience_score: number
  reasoning: string
  message_body: string
  status?: string
  sent_at?: string | null
  reply_at?: string | null
}

export interface CreatorRunOutput {
  drafts: OutreachDraft[]
  candidatePoolSize: number
  notes: string
}

export async function runCreatorOutreach(input: CreatorRunInput): Promise<CreatorRunOutput> {
  const ws = input.workspace
  const picks = Math.min(FINAL_PICKS, Math.max(3, input.picks ?? FINAL_PICKS))

  const candidates = await pullCandidates()
  if (candidates.length === 0) {
    return {
      drafts: [],
      candidatePoolSize: 0,
      notes: 'No candidates available. Make sure xhunter_accounts has rows with followers ≤ 10,000.',
    }
  }

  const system = withVoice(
    'You are a creator-outreach specialist. Given a product\'s ICP/positioning '
    + 'and a pool of candidate creators (handle, bio, recent tweets), you do '
    + 'TWO things per candidate: (1) score 0-100 buyer-trust signal — how '
    + 'likely is this creator\'s audience to overlap with the ICP and trust '
    + 'their endorsement, and (2) draft a personalized X DM that references '
    + 'one specific recent tweet, mentions the product, and proposes a small '
    + 'concrete next step. Reply with ONLY a JSON object.',
    ws.voice,
  )

  // Trim each candidate so the prompt stays in budget.
  const candidatePayload = candidates.map((c) => ({
    handle: c.handle,
    name: c.display_name,
    followers: c.followers,
    bio: c.bio?.slice(0, 240) || '',
    recent_tweets: c.recent_tweets.slice(0, TWEETS_PER_CANDIDATE).map((t) => t.slice(0, 280)),
  }))

  const user = [
    `WORKSPACE CONTEXT:\n${workspaceContext(ws)}`,
    input.notes ? `\nFounder notes: ${input.notes}` : '',
    '',
    `CANDIDATES (${candidatePayload.length}):`,
    ...candidatePayload.map((c, i) => `${i + 1}. @${c.handle} (${c.followers ?? '?'}f) — ${c.name || ''}\n   bio: ${c.bio}\n   recent: ${c.recent_tweets.map((t, j) => `${j + 1}) ${t}`).join(' || ')}`),
    '',
    `Pick the top ${picks} candidates by buyer-trust signal. For each, return a personalized DM that references ONE specific tweet of theirs.`,
    '',
    'Return JSON exactly:',
    '{',
    '  "scored": [',
    '    {',
    '      "handle": "<handle without @>",',
    '      "audience_score": 0-100,',
    '      "reasoning": "<1 sentence — why their audience matches the ICP>",',
    '      "message_body": "<60-180 chars, no hashtags, no link unless natural, references one of their recent tweets specifically>"',
    '    }',
    '  ]',
    '}',
    '',
    'Rules for message_body:',
    '- Open with a sincere reference to their work (not generic flattery).',
    '- Then pivot to one specific reason this product helps the people they\'re writing to.',
    '- End with a low-friction ask ("would love your gut take", "happy to send a beta key", etc).',
    '- Sound like the founder (see voice profile), not a marketer.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 3500, temperature: 0.6 })
  const parsed = extractJson<ScoredRaw>(raw)
  if (!parsed || !Array.isArray(parsed.scored)) {
    return {
      drafts: [],
      candidatePoolSize: candidates.length,
      notes: process.env.MINIMAX_API_KEY
        ? 'LLM returned no parseable response — try again with fewer picks or refine the workspace context.'
        : 'Agent unavailable — set MINIMAX_API_KEY to enable Creator Outreach.',
    }
  }

  const byHandle = new Map<string, CreatorCandidate>()
  for (const c of candidates) byHandle.set(c.handle.toLowerCase(), c)

  const drafts: DraftRow[] = []
  for (const s of parsed.scored.slice(0, picks)) {
    const handle = String(s.handle || '').replace(/^@/, '').toLowerCase()
    const cand = byHandle.get(handle)
    if (!cand) continue
    const score = Math.max(0, Math.min(100, Math.round(Number(s.audience_score) || 0)))
    drafts.push({
      workspace_id: ws.id,
      channel: 'x_dm',
      target_handle: cand.handle,
      target_name: cand.display_name,
      target_url: `https://x.com/${cand.handle}`,
      audience_score: score,
      reasoning: String(s.reasoning || '').slice(0, 400),
      message_body: String(s.message_body || '').slice(0, 800),
      status: 'queued',
    })
  }

  if (drafts.length === 0) {
    return { drafts: [], candidatePoolSize: candidates.length, notes: 'Model returned no usable drafts.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_drafts')
    .insert(drafts)
    .select('id, target_handle, target_name, audience_score, reasoning, message_body')
  if (error) {
    console.error('[creator] insert failed:', error.message)
    return { drafts: [], candidatePoolSize: candidates.length, notes: `Database insert failed: ${error.message}` }
  }

  return {
    drafts: (data || []).map((d) => {
      const cand = byHandle.get((d.target_handle as string).toLowerCase())
      return {
        id: d.id as string,
        handle: d.target_handle as string,
        display_name: (d.target_name as string | null) ?? cand?.display_name ?? null,
        followers: cand?.followers ?? null,
        audience_score: d.audience_score as number,
        reasoning: d.reasoning as string,
        message_body: d.message_body as string,
      }
    }).sort((a, b) => b.audience_score - a.audience_score),
    candidatePoolSize: candidates.length,
    notes: `Drafted ${drafts.length} DMs from a pool of ${candidates.length} creators ≤ ${MAX_FOLLOWERS} followers.`,
  }
}

export async function updateDraftStatus(id: string, status: 'sent' | 'skipped' | 'replied'): Promise<boolean> {
  const admin = createAdminClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'sent') patch.sent_at = new Date().toISOString()
  if (status === 'replied') patch.reply_at = new Date().toISOString()
  const { error } = await admin.from('outreach_drafts').update(patch).eq('id', id)
  if (error) {
    console.error('[creator] status update failed:', error.message)
    return false
  }
  return true
}

export async function listDrafts(workspaceId: string): Promise<OutreachDraft[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_drafts')
    .select('id, target_handle, target_name, audience_score, reasoning, message_body, status, sent_at, reply_at')
    .eq('workspace_id', workspaceId)
    .eq('channel', 'x_dm')
    .order('audience_score', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[creator] list failed:', error.message)
    return []
  }
  return (data || []).map((d) => ({
    id: d.id as string,
    handle: d.target_handle as string,
    display_name: (d.target_name as string | null) ?? null,
    followers: null,
    audience_score: d.audience_score as number,
    reasoning: d.reasoning as string,
    message_body: d.message_body as string,
    // extra fields for UI
    status: d.status as string,
    sent_at: d.sent_at as string | null,
    reply_at: d.reply_at as string | null,
  }))
}

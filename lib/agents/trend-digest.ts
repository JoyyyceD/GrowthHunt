/**
 * Daily trend digest — surface tweets the workspace should "ride" today.
 *
 * Source pool (cheapest, no extra creds):
 *   - workspace.competitors[].url that are X profiles → their last 24h posts
 *   - workspace.voice_handle's followings (skipped v1 — needs OAuth)
 *   - a workspace-specific "tracked_handles" array on the workspace.icp_segments[].channels
 *     when they look like @handles (lightweight: just split by '@')
 *   - xhunter_accounts intersected with workspace's ICP category (fallback)
 *
 * For each candidate post:
 *   - LLM checks ICP relevance + drafts a 1-tweet "ride" reply/quote in voice
 *   - Picks best ViralX template skeleton from the user's TOP templates if
 *     a digest exists (uses self_post_digests.top_templates)
 *
 * Persisted into trend_candidates with status='new'; user reviews + acts.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson, workspaceContext, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'

const MAX_CANDIDATES = 30
const KEEP_TOP_K = 8
const DAY_MS = 24 * 60 * 60 * 1000

interface ApiTweet {
  id?: string
  text?: string
  url?: string
  createdAt?: string
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  viewCount?: number
  author?: { userName?: string }
}

interface Candidate {
  source: 'x_handle' | 'x_trend'
  source_handle?: string
  source_tweet_id: string
  url: string
  context_text: string
  engagement: number
}

function extractHandles(ws: Workspace): string[] {
  const out = new Set<string>()
  for (const c of ws.competitors || []) {
    const m = (c.url || '').match(/x\.com\/(@?[A-Za-z0-9_]{1,15})/i) || (c.url || '').match(/twitter\.com\/(@?[A-Za-z0-9_]{1,15})/i)
    if (m?.[1]) out.add(m[1].replace(/^@/, ''))
  }
  for (const seg of ws.icp_segments || []) {
    for (const ch of seg.channels || []) {
      const m = ch.match(/@([A-Za-z0-9_]{1,15})/)
      if (m?.[1]) out.add(m[1])
    }
  }
  return Array.from(out).slice(0, 12)
}

async function pullHandleTweets(handle: string): Promise<Candidate[]> {
  if (!process.env.TWITTERAPI_IO_KEY) return []
  const sinceTime = Math.floor((Date.now() - DAY_MS) / 1000)
  const query = `from:${handle} min_faves:30 since_time:${sinceTime}`
  const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Latest&cursor=`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'X-API-Key': process.env.TWITTERAPI_IO_KEY! } })
    if (!res.ok) return []
    const data = await res.json() as { tweets?: ApiTweet[] }
    const tweets = data?.tweets ?? []
    return tweets
      .filter((t): t is ApiTweet & { id: string; text: string } => !!t.id && !!t.text && !t.text.startsWith('RT @'))
      .map((t) => ({
        source: 'x_handle' as const,
        source_handle: handle,
        source_tweet_id: t.id,
        url: t.url || `https://x.com/${handle}/status/${t.id}`,
        context_text: t.text,
        engagement: (t.likeCount || 0) + 2 * (t.replyCount || 0) + 0.02 * (t.viewCount || 0),
      }))
  } catch { return [] } finally { clearTimeout(timer) }
}

async function pullXhunterFallback(ws: Workspace): Promise<Candidate[]> {
  // If no handle-derived candidates, pull top-engagement viral tweets from the
  // last 24h across xhunter_accounts as a fallback.
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - DAY_MS).toISOString()
  const { data } = await admin
    .from('xhunter_tweets')
    .select('id, handle, text, url, like_count, reply_count, view_count')
    .gte('created_at_x', cutoff)
    .eq('is_rt', false)
    .order('like_count', { ascending: false })
    .limit(MAX_CANDIDATES)
  void ws
  return (data || []).map((t) => ({
    source: 'x_trend' as const,
    source_handle: t.handle as string,
    source_tweet_id: t.id as string,
    url: t.url as string,
    context_text: t.text as string,
    engagement: (t.like_count as number) + 2 * (t.reply_count as number || 0) + 0.02 * (t.view_count as number || 0),
  }))
}

async function topSelfTemplates(workspaceId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('self_post_digests')
    .select('top_templates')
    .eq('workspace_id', workspaceId)
    .order('week_starting', { ascending: false })
    .limit(1)
    .maybeSingle()
  const top = (data?.top_templates as Array<{ skeleton: string }>) || []
  return top.map((t) => t.skeleton).slice(0, 3)
}

interface ScoredOutput {
  scored?: Array<{
    source_tweet_id?: string
    relevance?: number
    reasoning?: string
    drafted_post?: string
    template_used?: string
  }>
}

export interface RunTrendDigestOutput {
  inserted: number
  scanned: number
  notes: string
  candidates: Array<{
    id: string
    url: string
    context_text: string
    drafted_post: string
    template_used: string | null
    relevance: number
    reasoning: string | null
    source_handle: string | null
  }>
}

export async function runTrendDigest(workspace: Workspace): Promise<RunTrendDigestOutput> {
  const handles = extractHandles(workspace)
  let pool: Candidate[] = []
  for (const h of handles) {
    pool.push(...await pullHandleTweets(h))
  }
  if (pool.length < 6) {
    const fallback = await pullXhunterFallback(workspace)
    const seen = new Set(pool.map((c) => c.source_tweet_id))
    pool.push(...fallback.filter((c) => !seen.has(c.source_tweet_id)))
  }
  pool.sort((a, b) => b.engagement - a.engagement)
  pool = pool.slice(0, MAX_CANDIDATES)
  if (pool.length === 0) {
    return {
      inserted: 0,
      scanned: 0,
      notes: 'No candidates found. Add competitor X URLs (e.g. https://x.com/handle) on the workspace, or seed xhunter_accounts.',
      candidates: [],
    }
  }

  const templates = await topSelfTemplates(workspace.id)
  const templatesText = templates.length > 0
    ? `User's own TOP-performing template skeletons (prefer one of these):\n${templates.map((t, i) => `  ${i + 1}. ${t.slice(0, 200)}`).join('\n')}`
    : 'No personal template data yet — pick whatever feels natural.'

  const system = withVoice(
    'You are a social-media editor. For each candidate tweet, decide if the founder '
    + 'should "ride" it today and draft a single high-quality tweet they could post in '
    + 'response or as a quote-tweet. Be specific — reference a concrete word/idea from '
    + 'the source. Match the founder\'s voice. Reply with ONLY a JSON object.',
    workspace.voice,
  )
  const user = [
    `WORKSPACE CONTEXT:\n${workspaceContext(workspace)}`,
    '',
    templatesText,
    '',
    `CANDIDATES (${pool.length}):`,
    ...pool.map((c, i) => `[${i}] id=${c.source_tweet_id} from=@${c.source_handle || '?'} eng=${Math.round(c.engagement)}\n  ${c.context_text.slice(0, 320)}`),
    '',
    `Return at most ${KEEP_TOP_K} drafts. JSON exactly:`,
    '{',
    '  "scored": [',
    '    {',
    '      "source_tweet_id": "<echo>",',
    '      "relevance": 0-100,',
    '      "reasoning": "<one sentence>",',
    '      "drafted_post": "<≤270 char tweet ready to send>",',
    '      "template_used": "<short label e.g. \'list-of-3\' or \'contrast-pair\' or empty>"',
    '    }',
    '  ]',
    '}',
    'Skip irrelevant items (relevance < 40). Drafts must NOT use generic engagement-bait.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 3000, temperature: 0.55 })
  const parsed = extractJson<ScoredOutput>(raw)
  if (!parsed?.scored || !Array.isArray(parsed.scored)) {
    return { inserted: 0, scanned: pool.length, notes: 'Agent returned no drafts.', candidates: [] }
  }

  const byId = new Map(pool.map((c) => [c.source_tweet_id, c]))
  const keep = parsed.scored
    .filter((s) => s.source_tweet_id && byId.has(s.source_tweet_id))
    .filter((s) => (Number(s.relevance) || 0) >= 40 && s.drafted_post)
    .slice(0, KEEP_TOP_K)

  if (keep.length === 0) {
    return { inserted: 0, scanned: pool.length, notes: 'No drafts cleared the relevance threshold today.', candidates: [] }
  }

  const admin = createAdminClient()
  const rows = keep.map((s) => {
    const c = byId.get(s.source_tweet_id!)!
    return {
      workspace_id: workspace.id,
      source: c.source,
      source_handle: c.source_handle ?? null,
      source_tweet_id: c.source_tweet_id,
      url: c.url,
      context_text: c.context_text.slice(0, 1000),
      drafted_post: String(s.drafted_post).slice(0, 600),
      template_used: s.template_used ? String(s.template_used).slice(0, 80) : null,
      relevance: Math.max(0, Math.min(100, Math.round(Number(s.relevance) || 0))),
      reasoning: s.reasoning ? String(s.reasoning).slice(0, 300) : null,
      status: 'new',
    }
  })

  const { data, error } = await admin.from('trend_candidates').insert(rows).select('id, url, context_text, drafted_post, template_used, relevance, reasoning, source_handle')
  if (error) {
    return { inserted: 0, scanned: pool.length, notes: `Insert failed: ${error.message}`, candidates: [] }
  }

  return {
    inserted: (data || []).length,
    scanned: pool.length,
    notes: `Scanned ${pool.length} tweets from ${handles.length} tracked handle(s). ${(data || []).length} drafted.`,
    candidates: (data || []).map((r) => ({
      id: r.id as string,
      url: r.url as string,
      context_text: r.context_text as string,
      drafted_post: r.drafted_post as string,
      template_used: (r.template_used as string | null) ?? null,
      relevance: r.relevance as number,
      reasoning: (r.reasoning as string | null) ?? null,
      source_handle: (r.source_handle as string | null) ?? null,
    })),
  }
}

export interface TrendCandidate {
  id: string
  url: string
  context_text: string
  drafted_post: string
  template_used: string | null
  relevance: number
  reasoning: string | null
  source_handle: string | null
  status: string
  posted_tweet_id: string | null
  created_at: string
}

export async function listTrendCandidates(workspaceId: string, limit = 80): Promise<TrendCandidate[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('trend_candidates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).map((r) => ({
    id: r.id as string,
    url: r.url as string,
    context_text: r.context_text as string,
    drafted_post: r.drafted_post as string,
    template_used: (r.template_used as string | null) ?? null,
    relevance: r.relevance as number,
    reasoning: (r.reasoning as string | null) ?? null,
    source_handle: (r.source_handle as string | null) ?? null,
    status: r.status as string,
    posted_tweet_id: (r.posted_tweet_id as string | null) ?? null,
    created_at: r.created_at as string,
  }))
}

export async function updateCandidateStatus(id: string, status: 'saved' | 'dismissed' | 'posted', postedTweetId?: string): Promise<void> {
  const admin = createAdminClient()
  const patch: Record<string, unknown> = { status }
  if (postedTweetId) patch.posted_tweet_id = postedTweetId
  await admin.from('trend_candidates').update(patch).eq('id', id)
}

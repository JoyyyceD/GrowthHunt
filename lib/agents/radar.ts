/**
 * Community Radar v1 — Reddit + HackerNews.
 *
 * Pipeline:
 *   1. Derive 3-6 search queries from the workspace (ICP pains, competitor
 *      names, category keywords). LLM-assisted, with heuristic fallback.
 *   2. Hit Reddit (public JSON, no auth) and HN (Algolia, no auth) with
 *      each query; collect last-14-days posts only.
 *   3. Dedupe vs already-stored leads.
 *   4. LLM scores relevance + classifies intent + drafts a reply scaffold
 *      in the workspace voice. Reply is a *draft*, never auto-posted.
 *   5. Insert into radar_leads.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson, extractJsonArray, workspaceContext, withVoice } from './llm'
import type { Workspace } from '@/lib/workspace/types'

const MAX_QUERIES = 6
const MAX_AGE_DAYS = 14
const MAX_PER_QUERY = 10
const SCORE_BATCH = 12

type IntentKind = 'asking' | 'complaining' | 'discussing' | 'comparing' | 'other'
const VALID_INTENTS = new Set<IntentKind>(['asking', 'complaining', 'discussing', 'comparing', 'other'])

interface RawPost {
  source: 'reddit' | 'hackernews'
  source_id: string
  url: string
  title: string
  excerpt: string
  author: string
  posted_at: string
}

interface ScoredLead extends RawPost {
  intent: IntentKind
  relevance: number
  reasoning: string
  reply_draft: string
}

function ageOk(iso: string): boolean {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return false
  return Date.now() - t < MAX_AGE_DAYS * 24 * 60 * 60 * 1000
}

function heuristicQueries(ws: Workspace): string[] {
  const out = new Set<string>()
  for (const seg of ws.icp_segments) {
    for (const pain of seg.pains || []) {
      if (pain.length > 3) out.add(pain)
    }
  }
  for (const m of ws.key_messages) {
    if (m.length > 6) out.add(m.split(/[—:.]/)[0]!.trim())
  }
  for (const c of ws.competitors) {
    if (c.name && c.name.length > 2) out.add(c.name)
  }
  if (ws.name) out.add(ws.name)
  return Array.from(out).slice(0, MAX_QUERIES)
}

async function deriveQueries(ws: Workspace, note?: string): Promise<string[]> {
  if (!process.env.MINIMAX_API_KEY) return heuristicQueries(ws)
  const system =
    'You generate short, high-signal Reddit/HackerNews search queries for a '
    + 'product\'s "community radar". You want phrases real users would write '
    + 'when complaining, asking for help, or comparing tools in this space. '
    + 'Reply with ONLY a JSON array of 4-6 strings.'
  const user = [
    workspaceContext(ws),
    note ? `\nFounder notes: ${note}` : '',
    '',
    'Constraints:',
    '- 3-7 words each',
    '- avoid the product\'s brand name (we want demand signals, not mentions)',
    '- mix: 1-2 pain phrases, 1-2 "looking for X" patterns, 1 competitor comparison',
    '- no quotes, no boolean operators',
    '',
    'Reply: ["query1", "query2", ...]',
  ].join('\n')
  const raw = await callAgent({ system, user, maxTokens: 400, temperature: 0.5 })
  const arr = extractJsonArray(raw)
  if (!arr || arr.length === 0) return heuristicQueries(ws)
  return arr.slice(0, MAX_QUERIES)
}

const USER_AGENT = 'GrowthHuntRadar/1.0 (+https://growthhunt.ai)'
const FETCH_TIMEOUT = 8_000

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch { return null } finally { clearTimeout(timer) }
}

interface RedditListing {
  data?: { children?: Array<{ data?: {
    id?: string; permalink?: string; title?: string; selftext?: string;
    author?: string; created_utc?: number; subreddit?: string
  } }> }
}

async function searchReddit(query: string): Promise<RawPost[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${MAX_PER_QUERY}&restrict_sr=0`
  const data = await fetchJson<RedditListing>(url)
  if (!data?.data?.children) return []
  const out: RawPost[] = []
  for (const c of data.data.children) {
    const d = c.data
    if (!d?.id || !d.title || !d.permalink) continue
    const iso = d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString()
    if (!ageOk(iso)) continue
    out.push({
      source: 'reddit',
      source_id: d.id,
      url: `https://www.reddit.com${d.permalink}`,
      title: d.title.slice(0, 300),
      excerpt: (d.selftext || '').replace(/\s+/g, ' ').trim().slice(0, 700),
      author: d.author || 'unknown',
      posted_at: iso,
    })
  }
  return out
}

interface HnHit {
  objectID?: string
  title?: string
  story_text?: string
  comment_text?: string
  author?: string
  created_at?: string
  url?: string
  _tags?: string[]
}
interface HnResponse { hits?: HnHit[] }

async function searchHn(query: string): Promise<RawPost[]> {
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=${MAX_PER_QUERY}`
  const data = await fetchJson<HnResponse>(url)
  if (!data?.hits) return []
  const out: RawPost[] = []
  for (const h of data.hits) {
    if (!h.objectID) continue
    const iso = h.created_at || new Date().toISOString()
    if (!ageOk(iso)) continue
    const title = h.title || (h.comment_text ? h.comment_text.slice(0, 120) : '(comment)')
    const isStory = h._tags?.includes('story')
    out.push({
      source: 'hackernews',
      source_id: h.objectID,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      title: title.slice(0, 300),
      excerpt: (h.story_text || h.comment_text || '').replace(/\s+/g, ' ').trim().slice(0, 700),
      author: h.author || 'unknown',
      posted_at: iso,
    })
    void isStory
  }
  return out
}

async function alreadySeen(workspaceId: string, posts: RawPost[]): Promise<Set<string>> {
  if (posts.length === 0) return new Set()
  const admin = createAdminClient()
  const keys = posts.map((p) => `${p.source}:${p.source_id}`)
  const { data } = await admin
    .from('radar_leads')
    .select('source, source_id')
    .eq('workspace_id', workspaceId)
    .in('source', Array.from(new Set(posts.map((p) => p.source))))
  const have = new Set<string>()
  for (const r of (data || []) as Array<{ source: string; source_id: string }>) {
    have.add(`${r.source}:${r.source_id}`)
  }
  return new Set(keys.filter((k) => have.has(k)))
}

interface ScoredRaw {
  scored?: Array<{ key?: string; intent?: string; relevance?: number; reasoning?: string; reply_draft?: string }>
}

async function scoreBatch(ws: Workspace, posts: RawPost[]): Promise<ScoredLead[]> {
  if (posts.length === 0) return []
  const system = withVoice(
    'You are a community-listening analyst for an indie founder. For each post, '
    + 'score 0-100 how relevant it is as a sales/marketing lead for the workspace, '
    + 'classify the poster\'s intent, and draft a short, helpful, non-spammy '
    + 'reply the founder could post that genuinely helps the asker (mention the '
    + 'product only if natural — never lead with it). Reply with ONLY a JSON object.',
    ws.voice,
  )
  const user = [
    `WORKSPACE CONTEXT:\n${workspaceContext(ws)}`,
    '',
    `POSTS (${posts.length}, each with a key you must echo back):`,
    ...posts.map((p, i) => `[${i}] key=${p.source}:${p.source_id}\n  source=${p.source}, posted=${p.posted_at}\n  title: ${p.title}\n  excerpt: ${p.excerpt.slice(0, 400)}`),
    '',
    'Return JSON exactly:',
    '{',
    '  "scored": [',
    '    {',
    '      "key": "<echo the source:id>",',
    '      "intent": "asking | complaining | discussing | comparing | other",',
    '      "relevance": 0-100,',
    '      "reasoning": "<1 sentence>",',
    '      "reply_draft": "<3-6 sentences, helpful first, product mention optional>"',
    '    }',
    '  ]',
    '}',
    '',
    'Drop irrelevant items by giving them relevance < 30. Quality > quantity.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 3200, temperature: 0.4 })
  const parsed = extractJson<ScoredRaw>(raw)
  if (!parsed?.scored) return []

  const byKey = new Map<string, RawPost>()
  for (const p of posts) byKey.set(`${p.source}:${p.source_id}`, p)

  const out: ScoredLead[] = []
  for (const s of parsed.scored) {
    const key = (s.key || '').trim()
    const post = byKey.get(key)
    if (!post) continue
    const intent = VALID_INTENTS.has(s.intent as IntentKind) ? (s.intent as IntentKind) : 'other'
    const relevance = Math.max(0, Math.min(100, Math.round(Number(s.relevance) || 0)))
    out.push({
      ...post,
      intent,
      relevance,
      reasoning: String(s.reasoning || '').slice(0, 400),
      reply_draft: String(s.reply_draft || '').slice(0, 1000),
    })
  }
  return out
}

export interface RadarRunInput { workspace: Workspace; notes?: string }
export interface RadarLead {
  id: string
  source: string
  source_id: string
  url: string
  title: string
  excerpt: string | null
  author: string | null
  posted_at: string | null
  intent: string | null
  relevance: number
  reasoning: string | null
  reply_draft: string | null
  status: string
}
export interface RadarRunOutput {
  inserted: number
  scanned: number
  duplicates: number
  notes: string
  leads: RadarLead[]
}

export async function runRadar(input: RadarRunInput): Promise<RadarRunOutput> {
  const ws = input.workspace
  const queries = await deriveQueries(ws, input.notes)
  if (queries.length === 0) {
    return { inserted: 0, scanned: 0, duplicates: 0, notes: 'No queries derived — fill ICP pains, key messages or competitors in the workspace.', leads: [] }
  }

  const all: RawPost[] = []
  for (const q of queries) {
    const [r, h] = await Promise.all([searchReddit(q), searchHn(q)])
    all.push(...r, ...h)
  }
  // dedupe within this run
  const seen = new Map<string, RawPost>()
  for (const p of all) seen.set(`${p.source}:${p.source_id}`, p)
  const unique = Array.from(seen.values())

  const duplicateKeys = await alreadySeen(ws.id, unique)
  const fresh = unique.filter((p) => !duplicateKeys.has(`${p.source}:${p.source_id}`))

  // Score in batches to keep prompt small.
  const scored: ScoredLead[] = []
  for (let i = 0; i < fresh.length; i += SCORE_BATCH) {
    const slice = fresh.slice(i, i + SCORE_BATCH)
    const batch = await scoreBatch(ws, slice)
    scored.push(...batch)
  }

  const keep = scored.filter((s) => s.relevance >= 35)
  let leads: RadarLead[] = []
  if (keep.length > 0) {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('radar_leads')
      .upsert(keep.map((s) => ({
        workspace_id: ws.id,
        source: s.source,
        source_id: s.source_id,
        url: s.url,
        title: s.title,
        excerpt: s.excerpt,
        author: s.author,
        posted_at: s.posted_at,
        intent: s.intent,
        relevance: s.relevance,
        reasoning: s.reasoning,
        reply_draft: s.reply_draft,
        status: 'new',
      })), { onConflict: 'workspace_id,source,source_id', ignoreDuplicates: true })
      .select('*')
    if (error) {
      console.error('[radar] insert failed:', error.message)
    } else {
      leads = (data || []) as RadarLead[]
    }
  }

  return {
    inserted: leads.length,
    scanned: unique.length,
    duplicates: duplicateKeys.size,
    notes: `Ran ${queries.length} queries: ${queries.join(' · ')}`,
    leads,
  }
}

export async function listLeads(workspaceId: string, opts: { minRelevance?: number; status?: string } = {}): Promise<RadarLead[]> {
  const admin = createAdminClient()
  let q = admin
    .from('radar_leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('relevance', { ascending: false })
    .limit(80)
  if (opts.minRelevance !== undefined) q = q.gte('relevance', opts.minRelevance)
  if (opts.status) q = q.eq('status', opts.status)
  const { data, error } = await q
  if (error) {
    console.error('[radar] list failed:', error.message)
    return []
  }
  return (data || []) as RadarLead[]
}

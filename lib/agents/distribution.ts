/**
 * Multi-channel Distribution agent.
 *
 * One canonical post + URL + workspace context → platform-specific rewrites:
 *   - X            (single tweet OR 3-7 part thread)
 *   - LinkedIn     (200-350 word post, no hashtags, hook-first)
 *   - Reddit       (post body + suggested subreddit + title)
 *   - HackerNews   (Show HN / Ask HN title format)
 *   - Instagram    (caption with line breaks + emoji per voice profile)
 *   - TikTok       (script outline: hook / story / CTA)
 *   - Discord      (community-friendly message)
 *
 * Plus a suggested cadence (which platform to post when, hours after T0).
 *
 * v1 ships: generation + copy-to-clipboard + cadence display. Actual auto-
 * posting only available for X (via existing /api/viralx/post and user's
 * connected X credentials). Other platforms need manual paste.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson, workspaceContext, withVoice } from './llm'
import type { Workspace } from '@/lib/workspace/types'

export type PlatformId = 'x' | 'linkedin' | 'linkedin_long' | 'reddit' | 'hackernews' | 'instagram' | 'tiktok' | 'discord' | 'xiaohongshu'

export const PLATFORM_ORDER: PlatformId[] = ['x', 'linkedin', 'linkedin_long', 'reddit', 'hackernews', 'instagram', 'tiktok', 'discord', 'xiaohongshu']

export interface PlatformVariant {
  body: string
  threadParts?: string[]
  title?: string
  subreddit?: string
  hashtags?: string[]
  notes?: string
}

export interface CadenceEntry {
  platform: PlatformId
  post_at_offset_hours: number
  note?: string
}

export interface DistributionPost {
  id: string
  workspace_id: string
  topic: string
  source_url?: string | null
  variants: Partial<Record<PlatformId, PlatformVariant>>
  cadence: CadenceEntry[]
  status: string
  created_at: string
  updated_at: string
}

interface RawResponse {
  variants?: Partial<Record<PlatformId, {
    body?: string
    threadParts?: string[]
    title?: string
    subreddit?: string
    hashtags?: string[]
    notes?: string
  }>>
  cadence?: Array<{ platform?: string; post_at_offset_hours?: number; note?: string }>
}

export interface DistributionRunInput {
  workspace: Workspace
  topic: string
  sourceUrl?: string
  platforms?: PlatformId[]
}

export interface DistributionRunOutput {
  post: DistributionPost | null
  notes: string
}

const VALID_PLATFORMS = new Set<PlatformId>(PLATFORM_ORDER)

function sanitizeVariant(p: PlatformId, raw: unknown): PlatformVariant | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const body = typeof r.body === 'string' ? r.body.trim() : ''
  if (!body && !Array.isArray(r.threadParts)) return null
  return {
    body: body.slice(0, 4000),
    threadParts: Array.isArray(r.threadParts) ? r.threadParts.filter((t): t is string => typeof t === 'string').slice(0, 12) : undefined,
    title: typeof r.title === 'string' ? r.title.slice(0, 200) : undefined,
    subreddit: typeof r.subreddit === 'string' ? r.subreddit.replace(/^r\//, '').slice(0, 60) : undefined,
    hashtags: Array.isArray(r.hashtags) ? r.hashtags.filter((t): t is string => typeof t === 'string').slice(0, 8) : undefined,
    notes: typeof r.notes === 'string' ? r.notes.slice(0, 300) : undefined,
  }
}

export async function runDistribution(input: DistributionRunInput): Promise<DistributionRunOutput> {
  const ws = input.workspace
  const platforms = (input.platforms && input.platforms.length > 0
    ? input.platforms.filter((p) => VALID_PLATFORMS.has(p))
    : PLATFORM_ORDER)

  const system = withVoice(
    'You are a multi-channel content director. Given one canonical post + a '
    + 'product context, you produce platform-native rewrites — NOT copy-paste '
    + 'with hashtags swapped. Each platform has its own grammar:\n'
    + '  - X: single tweet ≤ 280 chars OR a thread (3-7 parts, each ≤ 270).\n'
    + '  - LinkedIn: 200-350 words, hook on line 1, no hashtag spam (≤ 3).\n'
    + '  - LinkedIn long: 1200-1800 words narrative — open with a scene/hook, body '
    + '    with 3 acts or sub-headings, end with one CTA question. No emoji spam.\n'
    + '  - Reddit: long-form post + suggested subreddit + scroll-stopping title.\n'
    + '  - HackerNews: just a great title; body optional (HN punishes promo).\n'
    + '  - Instagram: caption with line breaks + 10-image carousel script — for each '
    + '    image, give an on-screen-text line + caption snippet; 5-10 hashtags.\n'
    + '  - TikTok: 60s script outline — Hook (0-3s), Story (4-50s, every 10s a beat), '
    + '    CTA (50-60s). Include suggested b-roll per beat.\n'
    + '  - Discord: chatty, ≤ 250 chars, no hard sell.\n'
    + '  - 小红书 (Xiaohongshu): emoji 标题 (≤20 字) + 5-段式正文（痛点/转折/方法/'
    + '    案例/收尾）+ 3-5 个 #话题标签. 简体中文，口语化，emoji 大量使用.\n'
    + 'Also suggest a cadence (platform + hours offset from T0). Reply ONLY a JSON object.',
    ws.voice,
  )

  const user = [
    `WORKSPACE CONTEXT:\n${workspaceContext(ws)}`,
    '',
    `CANONICAL POST: ${input.topic}`,
    input.sourceUrl ? `SOURCE URL: ${input.sourceUrl}` : '',
    `PLATFORMS: ${platforms.join(', ')}`,
    '',
    'Return JSON exactly:',
    '{',
    '  "variants": {',
    '    "x":             {"body": "<single tweet>", "threadParts": ["<part 1>", "<part 2>"]},',
    '    "linkedin":      {"body": "<200-350 word post>", "hashtags": ["..."]},',
    '    "linkedin_long": {"body": "<1200-1800 word LinkedIn article in narrative voice>", "title": "<article title>"},',
    '    "reddit":        {"title": "<title>", "body": "<post>", "subreddit": "indiehackers", "notes": "<why this sub>"},',
    '    "hackernews":    {"title": "<Show HN: ... or Ask HN: ...>", "body": "<optional 2-3 sentences>"},',
    '    "instagram":     {"body": "<caption>", "threadParts": ["[Slide 1 text] caption snippet", "[Slide 2 text] ...", "..."], "hashtags": ["..."]},',
    '    "tiktok":        {"body": "Hook (0-3s): ...\\nBeat 1 (4-15s): ...\\nBeat 2 (16-30s): ...\\nBeat 3 (31-50s): ...\\nCTA (50-60s): ...\\nB-roll: ..."},',
    '    "discord":       {"body": "<chatty 1-3 sentence message>"},',
    '    "xiaohongshu":   {"title": "<emoji 标题 ≤20 字>", "body": "<5-段式正文，emoji 多>", "hashtags": ["#标签1", "#标签2"]}',
    '  },',
    '  "cadence": [',
    '    {"platform": "x", "post_at_offset_hours": 0, "note": "best 9-11am ET"},',
    '    {"platform": "linkedin", "post_at_offset_hours": 2},',
    '    ...',
    '  ]',
    '}',
    '',
    'Only include the requested platforms. Cadence should stagger over 48-72h.',
  ].join('\n')

  const raw = await callAgent({ system, user, maxTokens: 4500, temperature: 0.6 })
  const parsed = extractJson<RawResponse>(raw)
  if (!parsed?.variants) {
    return {
      post: null,
      notes: process.env.MINIMAX_API_KEY
        ? 'LLM returned no parseable variants.'
        : 'Agent unavailable — set MINIMAX_API_KEY.',
    }
  }

  const variants: Partial<Record<PlatformId, PlatformVariant>> = {}
  for (const p of platforms) {
    const v = sanitizeVariant(p, parsed.variants[p])
    if (v) variants[p] = v
  }
  const cadence: CadenceEntry[] = (parsed.cadence || [])
    .filter((c): c is { platform: string; post_at_offset_hours?: number; note?: string } => !!c && typeof c.platform === 'string')
    .filter((c) => VALID_PLATFORMS.has(c.platform as PlatformId))
    .map((c) => ({
      platform: c.platform as PlatformId,
      post_at_offset_hours: Math.max(0, Math.min(168, Math.round(Number(c.post_at_offset_hours) || 0))),
      note: c.note?.slice(0, 200),
    }))

  if (Object.keys(variants).length === 0) {
    return { post: null, notes: 'No variants generated.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('distribution_posts')
    .insert({
      workspace_id: ws.id,
      topic: input.topic.slice(0, 1000),
      source_url: input.sourceUrl || null,
      variants,
      cadence,
      status: 'draft',
    })
    .select('*')
    .single()
  if (error) return { post: null, notes: `Insert failed: ${error.message}` }

  return {
    post: data as DistributionPost,
    notes: `Generated ${Object.keys(variants).length} variants across ${platforms.length} requested platforms.`,
  }
}

export async function listDistributionPosts(workspaceId: string): Promise<DistributionPost[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('distribution_posts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(40)
  if (error) return []
  return (data || []) as DistributionPost[]
}

export async function getDistributionPost(id: string): Promise<DistributionPost | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('distribution_posts').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return data as DistributionPost
}

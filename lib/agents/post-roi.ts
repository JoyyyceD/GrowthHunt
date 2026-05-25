/**
 * Self-post ROI feedback loop.
 *
 *   1. Pull workspace owner's recent original tweets via twitterapi.io
 *      (same pattern as /api/viralx/cron/ingest, but for their OWN handle
 *      and without the min_faves floor — we want ALL posts, including duds).
 *   2. Classify each post by template (detectInTweetRepetition + skeletonize).
 *   3. Compute engagement_score = likes + 0.5*replies + 0.2*bookmarks + 0.02*views.
 *   4. Persist to self_posts with on-conflict upsert (so re-ingest just updates).
 *   5. Roll up by template_skeleton into top-3 / bottom-3 with avg engagement.
 *   6. LLM writes 3 angle recommendations from the data.
 *
 * Designed for the "minimum viable wedge": even with sparse data (say 12
 * posts in 90 days), the digest is useful because it tells the founder
 * which of THEIR formats actually worked.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { detectInTweetRepetition, skeletonize } from '@/lib/viralx/template-detect'
import { callAgent, extractJson, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'

const INGEST_TIMEOUT_MS = 15_000
const FETCH_GAP_MS = 2_500
const DAYS_BACK = 90
const MAX_PAGES = 3  // twitterapi pagination cap to stay polite

interface ApiTweet {
  id?: string
  text?: string
  url?: string
  createdAt?: string
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  viewCount?: number
  bookmarkCount?: number
}

function engagementScore(t: { likeCount?: number; replyCount?: number; bookmarkCount?: number; viewCount?: number }): number {
  return (t.likeCount || 0)
    + 0.5 * (t.replyCount || 0)
    + 0.2 * (t.bookmarkCount || 0)
    + 0.02 * (t.viewCount || 0)
}

export interface IngestSelfPostsResult {
  handle: string
  fetched: number
  upserted: number
  errors: string[]
}

export async function ingestSelfPosts(workspace: Workspace): Promise<IngestSelfPostsResult> {
  const handle = (workspace.voice_handle || '').replace(/^@/, '').trim()
  if (!handle) {
    return { handle: '', fetched: 0, upserted: 0, errors: ['workspace.voice_handle is empty'] }
  }
  if (!process.env.TWITTERAPI_IO_KEY) {
    return { handle, fetched: 0, upserted: 0, errors: ['TWITTERAPI_IO_KEY not set'] }
  }

  const admin = createAdminClient()
  const sinceTime = Math.floor((Date.now() - DAYS_BACK * 86_400_000) / 1000)
  const errors: string[] = []
  let fetched = 0
  let upserted = 0
  let cursor = ''

  for (let page = 0; page < MAX_PAGES; page++) {
    const query = `from:${handle} since_time:${sinceTime}`
    const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Latest&cursor=${encodeURIComponent(cursor)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS)
    let json: { tweets?: ApiTweet[]; data?: { tweets?: ApiTweet[] }; next_cursor?: string } | null = null
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'X-API-Key': process.env.TWITTERAPI_IO_KEY! },
      })
      if (!res.ok) { errors.push(`page ${page}: HTTP ${res.status}`); break }
      json = await res.json()
    } catch (err) {
      errors.push(`page ${page}: ${(err as Error).message}`)
      break
    } finally { clearTimeout(timer) }

    const tweets: ApiTweet[] = json?.tweets ?? json?.data?.tweets ?? []
    if (tweets.length === 0) break
    fetched += tweets.length

    const rows = tweets
      .filter((t): t is ApiTweet & { id: string; text: string } => !!t.id && !!t.text)
      .filter((t) => !t.text.startsWith('RT @'))
      .map((t) => {
        const rep = detectInTweetRepetition(t.text)
        const skel = rep.isTemplate
          ? (rep.templateSkeleton || skeletonize(t.text))
          : skeletonize(t.text)
        return {
          id: t.id,
          workspace_id: workspace.id,
          handle,
          text: t.text,
          url: t.url || `https://x.com/${handle}/status/${t.id}`,
          created_at_x: new Date(t.createdAt || Date.now()).toISOString(),
          like_count: t.likeCount || 0,
          retweet_count: t.retweetCount || 0,
          reply_count: t.replyCount || 0,
          view_count: t.viewCount || 0,
          bookmark_count: t.bookmarkCount || 0,
          is_rt: false,
          is_template: rep.isTemplate,
          template_skeleton: skel,
          engagement_score: engagementScore(t),
        }
      })

    if (rows.length > 0) {
      const { error } = await admin.from('self_posts').upsert(rows, { onConflict: 'id' })
      if (error) errors.push(`upsert: ${error.message}`)
      else upserted += rows.length
    }

    cursor = (json?.next_cursor as string) || ''
    if (!cursor) break
    await new Promise((r) => setTimeout(r, FETCH_GAP_MS))
  }

  return { handle, fetched, upserted, errors }
}

export interface TemplateGroup {
  skeleton: string
  posts_count: number
  avg_engagement: number
  avg_likes: number
  best_example: { url: string; text: string; engagement_score: number } | null
}

interface PostRow {
  id: string; text: string; url: string; created_at_x: string;
  like_count: number; reply_count: number; view_count: number; bookmark_count: number;
  template_skeleton: string | null; is_template: boolean; engagement_score: number;
}

function groupByTemplate(rows: PostRow[]): TemplateGroup[] {
  const groups = new Map<string, PostRow[]>()
  for (const r of rows) {
    const key = r.template_skeleton || (r.is_template ? '{TEMPLATE}' : skeletonize(r.text).slice(0, 60))
    const arr = groups.get(key) || []
    arr.push(r)
    groups.set(key, arr)
  }
  const out: TemplateGroup[] = []
  for (const [skeleton, arr] of groups.entries()) {
    if (arr.length < 1) continue
    const totalEngagement = arr.reduce((s, r) => s + r.engagement_score, 0)
    const totalLikes = arr.reduce((s, r) => s + r.like_count, 0)
    const best = arr.slice().sort((a, b) => b.engagement_score - a.engagement_score)[0]!
    out.push({
      skeleton,
      posts_count: arr.length,
      avg_engagement: totalEngagement / arr.length,
      avg_likes: totalLikes / arr.length,
      best_example: { url: best.url, text: best.text, engagement_score: best.engagement_score },
    })
  }
  return out
}

export interface PostRoiDigest {
  workspace_id: string
  posts_count: number
  top_templates: TemplateGroup[]
  bottom_templates: TemplateGroup[]
  recommendations: string[]
  weekStarting: string
}

function startOfIsoWeek(d = new Date()): string {
  const day = d.getUTCDay() || 7
  const monday = new Date(d)
  if (day !== 1) monday.setUTCDate(d.getUTCDate() - (day - 1))
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export async function buildRoiDigest(workspace: Workspace, opts: { lookbackDays?: number } = {}): Promise<PostRoiDigest> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - (opts.lookbackDays ?? DAYS_BACK) * 86_400_000).toISOString()
  const { data } = await admin
    .from('self_posts')
    .select('id, text, url, created_at_x, like_count, reply_count, view_count, bookmark_count, template_skeleton, is_template, engagement_score')
    .eq('workspace_id', workspace.id)
    .gte('created_at_x', cutoff)
    .order('created_at_x', { ascending: false })
    .limit(500)
  const rows = (data || []) as PostRow[]

  // Need at least 2+ posts per template for a meaningful comparison
  const allGroups = groupByTemplate(rows).filter((g) => g.posts_count >= 1)
  const eligibleForRanking = allGroups.filter((g) => g.posts_count >= 2)
  const ranked = eligibleForRanking.slice().sort((a, b) => b.avg_engagement - a.avg_engagement)
  const top = ranked.slice(0, 3)
  const bottom = ranked.slice(-3).reverse().filter((g) => !top.includes(g))

  const recommendations = await suggestAngles(workspace, top, bottom, rows.length)

  return {
    workspace_id: workspace.id,
    posts_count: rows.length,
    top_templates: top,
    bottom_templates: bottom,
    recommendations,
    weekStarting: startOfIsoWeek(),
  }
}

async function suggestAngles(ws: Workspace, top: TemplateGroup[], bottom: TemplateGroup[], totalPosts: number): Promise<string[]> {
  if (totalPosts < 4) {
    return [
      'Not enough posts yet for personalized recommendations — we need at least 4 posts in the last 90 days to find patterns.',
      `Try the ${ws.voice ? 'voice profile' : 'Voice Trainer'} to seed a consistent angle.`,
      'Browse /viralx for proven templates to start from.',
    ]
  }
  const system = withVoice(
    'You are a social-media strategist reviewing the founder\'s own posts. '
    + 'Given the TOP-performing and BOTTOM-performing template patterns from their '
    + 'last 90 days, output 3-5 concrete recommendations. Be specific (reference '
    + 'the best-example tweet by quoting a fragment). No platitudes. Reply with ONLY '
    + 'a JSON object {"recommendations": ["...", "..."]}.',
    ws.voice,
  )
  const user = [
    `Founder: @${ws.voice_handle || ''} · Workspace: ${ws.name}`,
    `Total recent posts: ${totalPosts}`,
    '',
    'TOP templates (best avg engagement):',
    ...top.map((t, i) => `${i + 1}. skeleton="${t.skeleton.slice(0, 100)}" · ${t.posts_count} posts · avg engagement ${t.avg_engagement.toFixed(1)} · best: "${t.best_example?.text.slice(0, 200) || ''}"`),
    '',
    'BOTTOM templates:',
    ...bottom.map((t, i) => `${i + 1}. skeleton="${t.skeleton.slice(0, 100)}" · ${t.posts_count} posts · avg engagement ${t.avg_engagement.toFixed(1)}`),
    '',
    'Output 3-5 specific recommendations:',
    '- which template to reuse + why',
    '- which template to drop or rework',
    '- one new angle to try that mirrors their winners',
  ].join('\n')
  const raw = await callAgent({ system, user, maxTokens: 700, temperature: 0.5 })
  const parsed = extractJson<{ recommendations?: string[] }>(raw)
  if (!parsed?.recommendations || !Array.isArray(parsed.recommendations)) {
    return ['Agent unavailable — set MINIMAX_API_KEY to enable LLM recommendations.']
  }
  return parsed.recommendations.filter((x) => typeof x === 'string').slice(0, 5)
}

export async function persistDigest(digest: PostRoiDigest): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin
      .from('self_post_digests')
      .upsert({
        workspace_id: digest.workspace_id,
        week_starting: digest.weekStarting,
        posts_count: digest.posts_count,
        top_templates: digest.top_templates,
        bottom_templates: digest.bottom_templates,
        recommendations: digest.recommendations,
      }, { onConflict: 'workspace_id,week_starting' })
  } catch (err) {
    console.error('[post-roi] persistDigest failed:', (err as Error).message)
  }
}

export async function latestDigest(workspaceId: string): Promise<PostRoiDigest | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('self_post_digests')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('week_starting', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    workspace_id: workspaceId,
    posts_count: data.posts_count as number,
    top_templates: (data.top_templates as TemplateGroup[]) || [],
    bottom_templates: (data.bottom_templates as TemplateGroup[]) || [],
    recommendations: (data.recommendations as string[]) || [],
    weekStarting: data.week_starting as string,
  }
}

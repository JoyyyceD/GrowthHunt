/**
 * Launch Orchestrator.
 *
 * Six platforms; per-platform: checklist (deterministic, written from
 * 2026 algorithm research), copy templates (LLM-generated in voice), and
 * a timing recommendation engine.
 *
 *   - Product Hunt    — US Pacific midnight launch + hunter outreach
 *   - Hacker News     — weekday 8-10am ET, Show HN format
 *   - BetaList        — submission + 1-week wait
 *   - Indie Hackers   — milestone post, weekday morning
 *   - Reddit          — per-subreddit prime times + reply playbook
 *   - Smol            — async, low-effort, weekly
 *
 * v1 ships checklist + copy + timing. War-room features (live ranking
 * monitor + reminder pushes) are TODO for v2 — we surface the launch
 * date and the user can flip status to 'live'.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { callAgent, extractJson, workspaceContext, withVoice } from '@/lib/agents/llm'
import type { Workspace } from '@/lib/workspace/types'

export type LaunchPlatform = 'product_hunt' | 'hacker_news' | 'beta_list' | 'indie_hackers' | 'reddit' | 'smol'

export const ALL_PLATFORMS: LaunchPlatform[] = ['product_hunt', 'hacker_news', 'beta_list', 'indie_hackers', 'reddit', 'smol']

export const PLATFORM_LABEL: Record<LaunchPlatform, string> = {
  product_hunt: 'Product Hunt',
  hacker_news: 'Hacker News',
  beta_list: 'BetaList',
  indie_hackers: 'Indie Hackers',
  reddit: 'Reddit',
  smol: 'Smol',
}

interface ChecklistItem { id: string; label: string; deep_link?: string; tip?: string; done?: boolean }

interface PlatformChecklist {
  platform: LaunchPlatform
  pre_launch: ChecklistItem[]
  launch_day: ChecklistItem[]
  post_launch: ChecklistItem[]
}

interface PlatformTiming {
  platform: LaunchPlatform
  best_time_utc: string         // e.g. "07:01 UTC" (PH = 12:01am PT)
  weekday: string                // "any" | "Tue-Thu" | "Mon-Fri"
  notes: string
}

const PLATFORM_TIMING: Record<LaunchPlatform, PlatformTiming> = {
  product_hunt: { platform: 'product_hunt', best_time_utc: '07:01', weekday: 'Tue-Thu', notes: 'PH day starts 12:01am Pacific (07:01 UTC PST / 08:01 UTC PDT). Tue/Wed/Thu have less competition than Mon launches.' },
  hacker_news:  { platform: 'hacker_news',  best_time_utc: '13:00', weekday: 'Mon-Fri', notes: '8-10am Eastern (13-15 UTC) is the sweet spot. Show HN tag for product launches. Engage in comments first 90 min.' },
  beta_list:    { platform: 'beta_list',    best_time_utc: '15:00', weekday: 'any',     notes: 'Async — submission, then ~1 week review. Aim for Monday/Tuesday submission to land mid-week.' },
  indie_hackers:{ platform: 'indie_hackers',best_time_utc: '14:00', weekday: 'Mon-Wed', notes: 'Milestones post format ("I just shipped X — here\'s what I learned"). Weekday mornings get best comment activity.' },
  reddit:       { platform: 'reddit',       best_time_utc: '14:00', weekday: 'Mon-Thu', notes: 'Subreddit-specific. r/SideProject, r/EntrepreneurRideAlong friendly. Avoid r/startups self-promo rules.' },
  smol:         { platform: 'smol',         best_time_utc: '12:00', weekday: 'any',     notes: 'Low-stakes — submit any weekday. Quirky/minimal tools do well.' },
}

const PLATFORM_CHECKLIST: Record<LaunchPlatform, PlatformChecklist> = {
  product_hunt: {
    platform: 'product_hunt',
    pre_launch: [
      { id: 'ph-1', label: 'Find a hunter (≥1000 followers, active in your category)', deep_link: 'https://www.producthunt.com/discussions', tip: 'Higher-follower hunters get more visibility but lower hit-rate; mid-tier hunters often more responsive.' },
      { id: 'ph-2', label: 'Pre-launch teaser page on Product Hunt (collect upvoters)', deep_link: 'https://www.producthunt.com/products/new', tip: 'PH ranks by velocity in the first 6 hours — pre-launch followers convert faster.' },
      { id: 'ph-3', label: 'Prepare 5 gallery images (1270x760), 1 logo, 1 demo video (≤60s)' },
      { id: 'ph-4', label: 'Write first comment (founder story, 100-200 words)' },
      { id: 'ph-5', label: 'Draft 10-15 hunter outreach DMs in your voice' },
      { id: 'ph-6', label: 'Email list ready (early supporters to ping at 12:01am PT)' },
    ],
    launch_day: [
      { id: 'phl-1', label: 'Hunter posts at 12:01am PT (07:01 UTC PST)' },
      { id: 'phl-2', label: 'You post the founder comment within 5 minutes' },
      { id: 'phl-3', label: 'Email blast to your supporter list' },
      { id: 'phl-4', label: 'Tweet announcement with PH link (every 4 hours)' },
      { id: 'phl-5', label: 'Reply to every PH comment within 1 hour for 24h' },
      { id: 'phl-6', label: 'Cross-post in 2-3 relevant communities (Slack/Discord)' },
    ],
    post_launch: [
      { id: 'php-1', label: 'Thank-you post on PH (within 48h)' },
      { id: 'php-2', label: 'Add PH badge to your site if top-5' },
      { id: 'php-3', label: 'Email upvoters with what\'s next' },
    ],
  },
  hacker_news: {
    platform: 'hacker_news',
    pre_launch: [
      { id: 'hn-1', label: 'Title: "Show HN: <Product> – <one-line value>" (≤80 chars)', tip: 'HN penalizes hyperbole; lead with the technical or specific outcome.' },
      { id: 'hn-2', label: 'Be ready to answer "Why is this different?" in first comment' },
      { id: 'hn-3', label: 'Avoid blogspam — link directly to the tool or a short technical writeup' },
    ],
    launch_day: [
      { id: 'hnl-1', label: 'Post at 8-10am Eastern (13-15 UTC) on a weekday' },
      { id: 'hnl-2', label: 'Reply to every comment in first 90 minutes — HN scoring rewards engagement' },
      { id: 'hnl-3', label: 'DO NOT ask anyone to upvote (HN auto-detects ring voting)' },
    ],
    post_launch: [
      { id: 'hnp-1', label: 'If front page: write a "what I learned from HN" follow-up post for IH/X' },
      { id: 'hnp-2', label: 'If flagged: read the rules at https://news.ycombinator.com/showhn.html, adjust, retry in 1-2 weeks' },
    ],
  },
  beta_list: {
    platform: 'beta_list',
    pre_launch: [
      { id: 'bl-1', label: 'Submit at https://betalist.com/submit', deep_link: 'https://betalist.com/submit' },
      { id: 'bl-2', label: 'Tagline ≤50 chars (BetaList feeds it to Twitter)' },
      { id: 'bl-3', label: '5-7 day review period — submit Mon/Tue for mid-week landing' },
    ],
    launch_day: [
      { id: 'bll-1', label: 'When approved, BetaList tweets — quote-tweet with your story' },
      { id: 'bll-2', label: 'Add BetaList badge to landing page' },
    ],
    post_launch: [
      { id: 'blp-1', label: 'Reply to BetaList visitor DMs within 24h — high-intent leads' },
    ],
  },
  indie_hackers: {
    platform: 'indie_hackers',
    pre_launch: [
      { id: 'ih-1', label: 'Pick the milestone post angle: launch / first-paying-customer / $1k MRR / etc.' },
      { id: 'ih-2', label: 'Write 600-1000 word post — specific numbers, what went well/badly' },
    ],
    launch_day: [
      { id: 'ihl-1', label: 'Post Mon-Wed morning 9-11am ET (14-16 UTC)' },
      { id: 'ihl-2', label: 'Reply to every comment first 4 hours' },
    ],
    post_launch: [
      { id: 'ihp-1', label: 'Add to your IH profile milestones' },
    ],
  },
  reddit: {
    platform: 'reddit',
    pre_launch: [
      { id: 'rd-1', label: 'Pick 2-3 subreddits where you have karma + read their rules', tip: 'r/SideProject, r/EntrepreneurRideAlong, r/microsaas allow self-promo. Avoid r/startups.' },
      { id: 'rd-2', label: 'For each: write a unique post (Reddit detects identical x-posts)' },
      { id: 'rd-3', label: 'Read sub\'s top-of-week posts — match the tone' },
    ],
    launch_day: [
      { id: 'rdl-1', label: 'Post during subreddit prime time (varies — usually 14-18 UTC for US subs)' },
      { id: 'rdl-2', label: 'Reply to every comment with context, not just thanks' },
      { id: 'rdl-3', label: 'Do NOT cross-promote across subs in the same hour' },
    ],
    post_launch: [
      { id: 'rdp-1', label: 'AMA follow-up if engagement was high' },
    ],
  },
  smol: {
    platform: 'smol',
    pre_launch: [
      { id: 'sm-1', label: 'Submit at https://smol.fyi (or current smol launcher du jour)' },
      { id: 'sm-2', label: 'Quirky description — Smol audience rewards personality' },
    ],
    launch_day: [
      { id: 'sml-1', label: 'Cross-post to X with #builtinpublic' },
    ],
    post_launch: [
      { id: 'smp-1', label: 'Add to your "launches" section if Smol-featured' },
    ],
  },
}

export interface CampaignCopy {
  product_hunt?: { tagline: string; first_comment: string; hunter_dm: string }
  hacker_news?: { title: string; first_comment?: string }
  beta_list?: { tagline: string; description: string }
  indie_hackers?: { title: string; body: string }
  reddit?: Array<{ subreddit: string; title: string; body: string }>
  smol?: { tagline: string; description: string }
}

async function generateCopy(ws: Workspace, name: string, productUrl: string, tagline: string | null, platforms: LaunchPlatform[]): Promise<CampaignCopy> {
  const system = withVoice(
    'You are a launch copywriter. Generate platform-native copy for a product '
    + 'launch. Each platform has its own conventions — match them. Reply with '
    + 'ONLY a JSON object.',
    ws.voice,
  )
  const user = [
    `WORKSPACE CONTEXT:\n${workspaceContext(ws)}`,
    '',
    `LAUNCH:\nName: ${name}\nURL: ${productUrl}\nTagline (if any): ${tagline || '(generate one)'}\nPlatforms: ${platforms.join(', ')}`,
    '',
    'Return JSON with the platforms requested. For each:',
    '- product_hunt: {tagline (≤60 chars), first_comment (founder story 120-180 words, plain text), hunter_dm (warm DM ≤500 chars asking them to hunt)}',
    '- hacker_news: {title ("Show HN: <product> – <specific outcome>" ≤80 chars), first_comment (optional, ≤300 chars technical)}',
    '- beta_list: {tagline (≤50 chars), description (60-100 words)}',
    '- indie_hackers: {title (milestone-style), body (600-900 words)}',
    '- reddit: array of 2 entries with {subreddit (recommend appropriate one), title, body (Reddit-flavored 200-400 words)}',
    '- smol: {tagline (≤40 chars, quirky), description (≤60 words)}',
    '',
    'Skip platforms NOT in the requested list. Output JSON with only those keys.',
  ].join('\n')
  const raw = await callAgent({ system, user, maxTokens: 3500, temperature: 0.55 })
  const parsed = extractJson<CampaignCopy>(raw)
  return parsed || {}
}

function buildChecklists(platforms: LaunchPlatform[]): PlatformChecklist[] {
  return platforms.map((p) => PLATFORM_CHECKLIST[p]).filter(Boolean)
}

export interface CreateCampaignInput {
  workspace: Workspace
  name: string
  productUrl: string
  tagline?: string
  launchAt: string  // ISO
  platforms: LaunchPlatform[]
}

export interface LaunchCampaign {
  id: string
  workspace_id: string
  name: string
  product_url: string
  tagline: string | null
  launch_at: string
  platforms: LaunchPlatform[]
  checklist: PlatformChecklist[]
  copy: CampaignCopy
  status: string
  created_at: string
  updated_at: string
  timing: PlatformTiming[]
}

export async function createCampaign(input: CreateCampaignInput): Promise<LaunchCampaign | { error: string }> {
  const platforms = input.platforms.filter((p) => (ALL_PLATFORMS as string[]).includes(p))
  if (platforms.length === 0) return { error: 'Pick at least one platform' }

  const [copy, checklist] = await Promise.all([
    generateCopy(input.workspace, input.name, input.productUrl, input.tagline || null, platforms),
    Promise.resolve(buildChecklists(platforms)),
  ])

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('launch_campaigns')
    .insert({
      workspace_id: input.workspace.id,
      name: input.name.slice(0, 200),
      product_url: input.productUrl.slice(0, 500),
      tagline: input.tagline?.slice(0, 200) || null,
      launch_at: input.launchAt,
      platforms,
      checklist,
      copy,
      status: 'planning',
    })
    .select('*')
    .single()
  if (error) return { error: error.message }
  return hydrate(data)
}

function hydrate(row: Record<string, unknown>): LaunchCampaign {
  const platforms = (row.platforms as LaunchPlatform[]) || []
  return {
    id: row.id as string,
    workspace_id: row.workspace_id as string,
    name: row.name as string,
    product_url: row.product_url as string,
    tagline: (row.tagline as string | null) ?? null,
    launch_at: row.launch_at as string,
    platforms,
    checklist: (row.checklist as PlatformChecklist[]) || [],
    copy: (row.copy as CampaignCopy) || {},
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    timing: platforms.map((p) => PLATFORM_TIMING[p]).filter(Boolean),
  }
}

export async function listCampaigns(workspaceId: string): Promise<LaunchCampaign[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('launch_campaigns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('launch_at', { ascending: false })
    .limit(30)
  return (data || []).map(hydrate)
}

export async function getCampaign(id: string): Promise<LaunchCampaign | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('launch_campaigns').select('*').eq('id', id).maybeSingle()
  return data ? hydrate(data) : null
}

export async function updateCampaignChecklist(id: string, checklist: PlatformChecklist[], status?: string): Promise<void> {
  const admin = createAdminClient()
  const patch: Record<string, unknown> = { checklist }
  if (status) patch.status = status
  await admin.from('launch_campaigns').update(patch).eq('id', id)
}

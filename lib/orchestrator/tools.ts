/**
 * Chat tool registry — what the orchestrator can do per turn.
 *
 * Three tool categories:
 *   - "execute"  — run a real agent through tracedX(), return summary
 *   - "route"    — return a route_to + prefill payload, no DB write
 *   - "playbook" — kick off a multi-step playbook
 *
 * The MiniMax classifier returns one of the registered tool names plus
 * params; dispatch lives in chat.ts.
 */
import type { Workspace } from '@/lib/workspace/types'
import type { GtmTask } from './types'
import {
  tracedIcp, tracedVoice, tracedLanding, tracedCreator, tracedColdEmail,
  tracedDistribution, tracedRadar, tracedAbCreate, tracedCompetitor,
  tracedGeoAudit,
} from './agents'
import { listRecentTasks } from './tasks'
import { parseTargetCsv } from '@/lib/agents/cold-email'
import { ingestSelfPosts, buildRoiDigest, persistDigest } from '@/lib/agents/post-roi'
import { runTrendDigest } from '@/lib/agents/trend-digest'
import { createCampaign, ALL_PLATFORMS as LAUNCH_PLATFORMS, type LaunchPlatform } from '@/lib/agents/launch-orchestrator'
import { runVideoCoach, type VideoScenario } from '@/lib/agents/video-coach'
import { upsertCore, deleteCore, insertArchival, searchArchival, listCore } from './memory'
import { unifiedSchedule } from '@/lib/social/schedule'
import { getConnection } from '@/lib/postiz/store'
import { listConnections as listSocialConnections } from '@/lib/social/store'

export type ToolKind = 'execute' | 'route' | 'playbook' | 'answer'

export interface ToolCtx {
  workspace: Workspace
  userId: string
  conversationId: string
  /**
   * The chat_turn task id wrapping the current loop. Tools that spawn vertical
   * agents use this as their parent_task_id so /gtm/tasks/[id] shows the tree.
   */
  turnTaskId?: string
}

export interface ToolResult {
  /** Plain-text summary shown in the assistant bubble + fed back to MiniMax. */
  summary: string
  /** Optional richer payload for the UI (rendered as a structured card). */
  data?: unknown
  /**
   * Generative UI hint — when set, the chat bubble renders the matching card
   * component INSTEAD of the markdown summary. See components/agent-cards/*.
   * `kind` must be a key in the agent-card registry; `props` is JSON passed in.
   */
  ui?: { kind: string; props: Record<string, unknown> }
  /** When the user should be sent to a vertical agent page. */
  routeTo?: string
  /** Suggested follow-ups (chat-quick-reply buttons). */
  followups?: string[]
  /** Task id this tool produced, for "view full output" deep-link. */
  taskId?: string
}

export interface OrchestratorTool {
  name: string
  description: string
  /** JSON-schema-lite for the params; MiniMax prompt teaches it. */
  params: Record<string, { type: 'string' | 'number' | 'array' | 'boolean'; required?: boolean; description?: string }>
  kind: ToolKind
  /**
   * Lazy registry gate. Tools whose preconditions aren't satisfied (e.g. need
   * ICP filled in, need voice trained) are hidden from the prompt catalog so
   * MiniMax doesn't waste a turn picking them. Always-callable by name via
   * findTool() — predicate only filters the prompt, not dispatch.
   */
  enabledFor?: (ws: Workspace) => boolean
  run(params: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult>
}

/** True when the workspace has trained a voice profile (any signal). */
function hasVoice(ws: Workspace): boolean {
  return Boolean(ws.voice?.summary || ws.voice?.tone || ws.voice_handle)
}
function hasIcp(ws: Workspace): boolean {
  return Boolean(ws.icp_summary && ws.icp_summary.trim().length > 0)
}
function hasPositioning(ws: Workspace): boolean {
  return Boolean(ws.positioning && ws.positioning.trim().length > 0)
}
function hasCompetitors(ws: Workspace): boolean {
  return Array.isArray(ws.competitors) && ws.competitors.length > 0
}

function s(v: unknown): string { return typeof v === 'string' ? v.trim() : '' }
function n(v: unknown, d: number): number { const x = Number(v); return Number.isFinite(x) ? x : d }
function host(u: string): string { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

// ──────────────────────────── tools ────────────────────────────────────────

const TOOL_GET_WORKSPACE: OrchestratorTool = {
  name: 'get_workspace',
  description: "Show the user's current workspace config (ICP, positioning, voice, competitors). Use when the user asks 'what's my X' or 'show me my workspace'.",
  params: {},
  kind: 'execute',
  async run(_p, ctx) {
    const ws = ctx.workspace
    const lines: string[] = []
    lines.push(`**${ws.name}** · ${ws.url.replace(/^https?:\/\//, '')}`)
    if (ws.one_liner) lines.push(`> ${ws.one_liner}`)
    if (ws.positioning) lines.push(`\n**Positioning:** ${ws.positioning}`)
    if (ws.icp_summary) lines.push(`\n**ICP:** ${ws.icp_summary}`)
    if (ws.icp_segments?.length) lines.push(`\n**Segments:** ${ws.icp_segments.map((x) => x.name).filter(Boolean).join(', ')}`)
    if (ws.key_messages?.length) lines.push(`\n**Key messages:** ${ws.key_messages.slice(0, 3).join(' · ')}`)
    if (ws.voice?.summary) lines.push(`\n**Voice:** ${ws.voice.summary}`)
    if (ws.competitors?.length) lines.push(`\n**Competitors:** ${ws.competitors.map((c) => c.name).filter(Boolean).join(', ')}`)
    const missing: string[] = []
    if (!ws.icp_summary) missing.push('ICP')
    if (!ws.voice) missing.push('Voice')
    if (!ws.positioning) missing.push('Positioning')
    if (missing.length) lines.push(`\n_Missing: ${missing.join(', ')} — every downstream agent benefits from filling these in._`)
    return {
      summary: lines.join('\n'),
      data: ws,
      ui: {
        kind: 'workspace',
        props: {
          name: ws.name,
          url: ws.url,
          one_liner: ws.one_liner,
          positioning: ws.positioning,
          icp_summary: ws.icp_summary,
          segments: ws.icp_segments?.map((s) => s.name).filter(Boolean),
          key_messages: ws.key_messages?.slice(0, 3),
          competitors: ws.competitors?.map((c) => c.name).filter(Boolean),
          voice_summary: ws.voice?.summary,
          missing,
        },
      },
    }
  },
}

const TOOL_QUICK_GEO_AUDIT: OrchestratorTool = {
  name: 'quick_geo_audit',
  description: "Run a GEO (AI citation) audit on a URL. Returns a 0-100 score + top fixes. Use when the user asks 'audit my page' or 'GEO score for X'.",
  params: { url: { type: 'string', required: true, description: 'Full URL to audit' } },
  kind: 'execute',
  async run(p, ctx) {
    const url = s(p.url) || ctx.workspace.url
    const { task, result } = await tracedGeoAudit(url, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    const fixes = result.issues.slice(0, 3).map((i, n) => `${n + 1}. [${i.severity}] ${i.title}`).join('\n')
    return {
      summary: `**${host(result.url)}: ${result.overall_score}/100 (${result.grade})**\n\nTop fixes:\n${fixes || '_(no priority fixes)_'}\n\n[View full audit →](/geo?url=${encodeURIComponent(url)})`,
      data: { url: result.url, score: result.overall_score, grade: result.grade, issues: result.issues.length },
      ui: {
        kind: 'geo_score',
        props: {
          url: result.url,
          score: result.overall_score,
          grade: result.grade,
          issues: result.issues.slice(0, 5).map((i) => ({ title: i.title, severity: i.severity, fix_suggestion: i.fix_suggestion })),
          geo_url: `/geo?url=${encodeURIComponent(url)}`,
        },
      },
      taskId: task.id,
      followups: ['Apply fixes via PR', 'Run citation check on this URL', 'Audit my whole site'],
    }
  },
}

const TOOL_TRAIN_VOICE: OrchestratorTool = {
  name: 'train_voice',
  description: 'Train the founder voice profile from a given X handle. Saves to workspace.voice. Use when user says "train my voice" or "use @handle for voice".',
  params: { handle: { type: 'string', required: true, description: 'X handle, no @' } },
  kind: 'execute',
  async run(p, ctx) {
    const handle = s(p.handle).replace(/^@/, '')
    if (!handle) return { summary: 'I need an X handle to train on.' }
    const { task, result } = await tracedVoice({ handle, workspace: ctx.workspace }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    return {
      summary: `Trained voice profile on @${handle} (${result.sourceCount} samples).\n\n**Profile:** ${result.voice.summary}`,
      taskId: task.id,
      followups: ['Save to workspace', 'Try ICP agent next'],
    }
  },
}

const TOOL_RUN_ICP: OrchestratorTool = {
  name: 'run_icp_agent',
  description: 'Run the ICP/positioning agent — drafts ICP summary, segments, positioning, key messages, competitors. Use when the user wants to (re)establish their positioning.',
  params: { brief: { type: 'string', description: 'Optional founder context — recent customers, gut sense of pain' } },
  kind: 'execute',
  async run(p, ctx) {
    const { task, result } = await tracedIcp({ workspace: ctx.workspace, brief: s(p.brief) || undefined }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    return {
      summary: `**Positioning draft:** ${result.positioning || '(empty)'}\n\n**ICP:** ${result.icp_summary || '(empty)'}\n\n_To save to workspace, open the ICP agent page._`,
      data: result,
      routeTo: `/agents/icp?ws=${ctx.workspace.id}`,
      taskId: task.id,
      followups: ['Save these to workspace', 'Re-run with a different brief'],
    }
  },
}

const TOOL_LANDING_AUDIT: OrchestratorTool = {
  name: 'landing_audit',
  description: 'Conversion-focused landing page audit (different from GEO/AI audit). 6 dimensions, with rewrites. Use when user wants to fix conversion.',
  params: { url: { type: 'string', description: 'URL to audit; defaults to workspace.url' } },
  kind: 'execute',
  async run(p, ctx) {
    const url = s(p.url) || ctx.workspace.url
    const { task, result } = await tracedLanding({ workspace: ctx.workspace, url }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    const dims = result.dimensions.map((d) => `- ${d.label}: **${d.score}**/100`).join('\n')
    return {
      summary: `**${host(result.url)}: ${result.overall_score}/100 conversion (${result.grade})**\n\n${dims}\n\n[Full report with rewrites →](/agents/landing?ws=${ctx.workspace.id}&url=${encodeURIComponent(url)})`,
      taskId: task.id,
      followups: ['Show me the hero rewrite', 'GEO audit this page too'],
    }
  },
}

const TOOL_RADAR_SCAN: OrchestratorTool = {
  name: 'radar_scan',
  description: 'Scan Reddit + HN for posts your ICP is writing right now. Returns new leads with reply drafts.',
  params: { notes: { type: 'string', description: 'Optional: steer the queries' } },
  kind: 'execute',
  enabledFor: hasIcp,
  async run(p, ctx) {
    const { task, result } = await tracedRadar({ workspace: ctx.workspace, notes: s(p.notes) || undefined }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    return {
      summary: `${result.inserted} new leads (scanned ${result.scanned}, dupes ${result.duplicates}).\n\n${result.notes || ''}\n\n[Open lead inbox →](/agents/radar?ws=${ctx.workspace.id})`,
      taskId: task.id,
      followups: ['Show top 3 leads', 'Run again with different focus'],
    }
  },
}

const TOOL_COMPETITOR_SCAN: OrchestratorTool = {
  name: 'competitor_scan',
  description: "Snapshot all competitor URLs in the workspace and report any meaningful changes (pricing, copy, new sections).",
  params: {},
  kind: 'execute',
  enabledFor: hasCompetitors,
  async run(_p, ctx) {
    const { task, result } = await tracedCompetitor({ workspace: ctx.workspace, diff: true }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    return {
      summary: `Watched ${result.competitors} URL(s). **${result.snapshots}** fresh snapshot(s), **${result.diffs}** change(s).\n\n[Open competitor watch →](/agents/competitor?ws=${ctx.workspace.id})`,
      taskId: task.id,
      followups: ['Show me the changes', 'Add another competitor'],
    }
  },
}

const TOOL_CREATE_AB: OrchestratorTool = {
  name: 'create_ab_test',
  description: 'Mint tracked short URLs for 2-4 copy variants on the same target URL.',
  params: {
    name: { type: 'string', required: true },
    target_url: { type: 'string', required: true },
    variants: { type: 'array', required: true, description: 'Array of 2-4 copy strings' },
  },
  kind: 'execute',
  async run(p, ctx) {
    const name = s(p.name); const targetUrl = s(p.target_url)
    const copies = Array.isArray(p.variants) ? p.variants.map((x) => String(x)).filter(Boolean) : []
    if (!name || !targetUrl || copies.length < 2) return { summary: 'I need a name, target URL, and at least 2 variants.' }
    const { task, result } = await tracedAbCreate({ workspaceId: ctx.workspace.id, name, targetUrl, copies }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    if ('error' in (result as Record<string, unknown>)) return { summary: `A/B creation failed: ${(result as { error: string }).error}` }
    return {
      summary: `A/B test **"${name}"** created with ${copies.length} variants.\n\n[Open dashboard for tracked URLs →](/agents/ab?ws=${ctx.workspace.id})`,
      taskId: task.id,
      followups: ['Show me the tracked URLs'],
    }
  },
}

const TOOL_DRAFT_DISTRIBUTION: OrchestratorTool = {
  name: 'draft_distribution',
  description: 'Take one canonical post + optional URL → generate platform-native rewrites (X, LinkedIn, Reddit, HN, IG, TikTok, Discord) + cadence.',
  params: {
    topic: { type: 'string', required: true, description: 'The canonical message' },
    source_url: { type: 'string', description: 'Optional URL being promoted' },
    platforms: { type: 'array', description: 'Subset; default all 7' },
  },
  kind: 'execute',
  enabledFor: hasVoice,
  async run(p, ctx) {
    const topic = s(p.topic); if (!topic) return { summary: "Tell me what you want to post." }
    const platforms = Array.isArray(p.platforms) ? (p.platforms.map(String) as ('x' | 'linkedin' | 'reddit' | 'hackernews' | 'instagram' | 'tiktok' | 'discord')[]) : undefined
    const { task, result } = await tracedDistribution({ workspace: ctx.workspace, topic, sourceUrl: s(p.source_url) || undefined, platforms }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    if (!result.post) return { summary: result.notes || 'No variants generated.', taskId: task.id }
    const vs = Object.keys(result.post.variants).join(', ')
    return {
      summary: `Generated **${Object.keys(result.post.variants).length}** variants (${vs}) + cadence plan.\n\n[Open distribution page to copy each →](/agents/distribution?ws=${ctx.workspace.id})`,
      taskId: task.id,
      followups: ['Show the X variant', 'Send the LinkedIn version'],
    }
  },
}

const TOOL_DRAFT_CREATORS: OrchestratorTool = {
  name: 'draft_creator_outreach',
  description: 'Find ≤10k-follower creators matching ICP and draft personalized X DMs in voice.',
  params: {
    picks: { type: 'number', description: '3-12, default 12' },
    notes: { type: 'string', description: 'Optional steering note' },
  },
  kind: 'execute',
  enabledFor: (ws) => hasIcp(ws) && hasVoice(ws),
  async run(p, ctx) {
    const picks = Math.min(12, Math.max(3, n(p.picks, 12)))
    const { task, result } = await tracedCreator({ workspace: ctx.workspace, picks, notes: s(p.notes) || undefined }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    return {
      summary: `Drafted **${result.drafts.length}** DMs from a pool of ${result.candidatePoolSize} creators.\n\n[Review + send each →](/agents/creator?ws=${ctx.workspace.id})`,
      taskId: task.id,
      followups: ['Show the top 3 picks', 'Schedule all for tomorrow 9am'],
    }
  },
}

const TOOL_DRAFT_COLD_EMAIL: OrchestratorTool = {
  name: 'draft_cold_email',
  description: 'Draft B2B cold emails for a pasted target list (name, email, company, role per line).',
  params: {
    targets_csv: { type: 'string', required: true, description: 'Multi-line CSV-ish target list' },
    campaign_note: { type: 'string', description: 'Optional angle' },
  },
  kind: 'execute',
  enabledFor: (ws) => hasIcp(ws) && hasVoice(ws),
  async run(p, ctx) {
    const csv = s(p.targets_csv); if (!csv) return { summary: 'Paste your target list as name, email, company, role (one per line).', routeTo: `/agents/cold-email?ws=${ctx.workspace.id}` }
    const targets = parseTargetCsv(csv)
    if (targets.length === 0) return { summary: 'No valid emails parsed from that block.', routeTo: `/agents/cold-email?ws=${ctx.workspace.id}` }
    const { task, result } = await tracedColdEmail({ workspace: ctx.workspace, targets, campaignNote: s(p.campaign_note) || undefined }, { workspace_id: ctx.workspace.id, conversation_id: ctx.conversationId, triggered_by: 'chat' })
    return {
      summary: `Drafted **${result.drafts.length}** cold emails from ${targets.length} targets.\n\n[Review + Send each →](/agents/cold-email?ws=${ctx.workspace.id})`,
      taskId: task.id,
      followups: ['Send to the top scored one', 'Review the first draft'],
    }
  },
}

const TOOL_LIST_RUNS: OrchestratorTool = {
  name: 'list_recent_runs',
  description: 'Recall recent agent runs for this workspace. Use when user asks "what did you do?" or references something from earlier.',
  params: { limit: { type: 'number', description: 'Default 10, max 30' } },
  kind: 'execute',
  async run(p, ctx) {
    const limit = Math.min(30, Math.max(1, n(p.limit, 10)))
    const tasks: GtmTask[] = await listRecentTasks({ workspaceId: ctx.workspace.id, limit })
    if (tasks.length === 0) return { summary: 'No recent runs for this workspace yet.' }
    const lines = tasks.map((t) => `- **${t.kind}** ${t.status === 'succeeded' ? '✓' : t.status === 'failed' ? '✗' : '…'} ${t.summary || ''} _(${new Date(t.created_at).toISOString().slice(0, 16).replace('T', ' ')})_`)
    return { summary: lines.join('\n') }
  },
}

const TOOL_ROUTE_VOICE: OrchestratorTool = {
  name: 'open_voice_trainer',
  description: 'Send the user to the Voice Trainer page.',
  params: { handle: { type: 'string', description: 'Optional handle to prefill' } },
  kind: 'route',
  async run(p, ctx) {
    const handle = s(p.handle).replace(/^@/, '')
    return { summary: 'Opening Voice Trainer…', routeTo: `/agents/voice?ws=${ctx.workspace.id}${handle ? `&handle=${encodeURIComponent(handle)}` : ''}` }
  },
}

const TOOL_ROUTE_LANDING: OrchestratorTool = {
  name: 'open_landing_doctor',
  description: 'Send the user to the Landing Doctor page (deep audit + rewrites UI).',
  params: { url: { type: 'string' } },
  kind: 'route',
  async run(p, ctx) {
    const url = s(p.url) || ctx.workspace.url
    return { summary: 'Opening Landing Doctor…', routeTo: `/agents/landing?ws=${ctx.workspace.id}&url=${encodeURIComponent(url)}` }
  },
}

const TOOL_ANSWER_FALLBACK: OrchestratorTool = {
  name: 'answer',
  description: 'Default fallback when no other tool fits — just answer the user in plain text. Use for questions about general GTM advice, the platform, or chit-chat.',
  params: { reply: { type: 'string', required: true, description: 'The plain-text reply.' } },
  kind: 'answer',
  async run(p) {
    return { summary: s(p.reply) || "I'm not sure how to help with that. Try asking me to audit a URL, find creators, or train your voice." }
  },
}

const TOOL_START_PLAYBOOK: OrchestratorTool = {
  name: 'start_playbook',
  description: 'Start a multi-step playbook. Available playbook ids: onboarding, weekly_review, launch_post, find_first_100, pre_launch_geo_pass.',
  params: {
    playbook_id: { type: 'string', required: true },
    topic: { type: 'string', description: 'Required for launch_post' },
  },
  kind: 'playbook',
  async run(p, ctx) {
    // Defer the actual playbook import to avoid circular deps at tool registry build time.
    const { runPlaybook } = await import('@/lib/playbooks/runner')
    const playbookId = s(p.playbook_id)
    if (!playbookId) return { summary: 'Specify a playbook id.' }
    const params: Record<string, unknown> = {}
    if (p.topic) params.topic = s(p.topic)
    const result = await runPlaybook(playbookId, ctx.workspace, { triggeredBy: 'chat', conversationId: ctx.conversationId, params })
    if ('error' in result) return { summary: `Playbook failed: ${result.error}` }
    return {
      summary: `Started **${result.playbook.name}**. ${result.summary}\n\n[Track progress →](/gtm/tasks/${result.parentTaskId})`,
      taskId: result.parentTaskId,
      followups: ['Show me the result so far'],
    }
  },
}

const TOOL_POST_ROI: OrchestratorTool = {
  name: 'post_roi_digest',
  description: 'Refresh the founder\'s own-post ROI loop: pull last 90 days of their X posts, group by template, return TOP-3 / BOTTOM-3 templates + angle recommendations.',
  params: {},
  kind: 'execute',
  enabledFor: (ws) => Boolean(ws.voice_handle),
  async run(_p, ctx) {
    const ingest = await ingestSelfPosts(ctx.workspace)
    if (ingest.errors.length > 0 && ingest.upserted === 0) {
      return { summary: `Couldn't ingest posts: ${ingest.errors.join('; ')}`, routeTo: `/agents/post-roi?ws=${ctx.workspace.id}` }
    }
    const digest = await buildRoiDigest(ctx.workspace)
    await persistDigest(digest)
    const top = digest.top_templates.slice(0, 3).map((t, i) => `${i + 1}. avg ${Math.round(t.avg_engagement)} eng · ${t.posts_count} posts`).join('\n')
    return {
      summary: `Refreshed Post ROI digest (${digest.posts_count} posts analyzed).\n\n**Top templates:**\n${top || '_(need 4+ posts in 90 days)_'}\n\n[Open full digest →](/agents/post-roi?ws=${ctx.workspace.id})`,
      followups: ['What angle should I try next?', 'Generate today\'s trend digest'],
    }
  },
}

const TOOL_TREND_DIGEST: OrchestratorTool = {
  name: 'daily_trend_digest',
  description: 'Build today\'s "tweets to ride" digest: scan tracked X handles + workspace context, draft 3-8 ready-to-send posts in founder voice using their TOP-performing templates.',
  params: {},
  kind: 'execute',
  enabledFor: hasVoice,
  async run(_p, ctx) {
    const r = await runTrendDigest(ctx.workspace)
    return {
      summary: `${r.inserted} drafts (scanned ${r.scanned}). ${r.notes}\n\n[Review + post →](/agents/trend-digest?ws=${ctx.workspace.id})`,
      followups: ['Show today\'s top draft', 'Refresh again'],
    }
  },
}

const TOOL_LAUNCH_INIT: OrchestratorTool = {
  name: 'launch_orchestrator_init',
  description: 'Create a new multi-platform launch campaign — generates checklists + platform-native copy + timing for PH/HN/BetaList/IH/Reddit/Smol.',
  enabledFor: (ws) => hasPositioning(ws) && hasVoice(ws),
  params: {
    name: { type: 'string', required: true },
    product_url: { type: 'string', description: 'Defaults to workspace.url' },
    tagline: { type: 'string' },
    launch_at: { type: 'string', description: 'ISO date; defaults to next Tuesday 12:01am PT' },
    platforms: { type: 'array', description: 'Subset of product_hunt, hacker_news, beta_list, indie_hackers, reddit, smol' },
  },
  kind: 'execute',
  async run(p, ctx) {
    const name = s(p.name); if (!name) return { summary: 'Need a launch name.' }
    const productUrl = s(p.product_url) || ctx.workspace.url
    const platforms = (Array.isArray(p.platforms) ? p.platforms : [])
      .filter((x): x is LaunchPlatform => typeof x === 'string' && (LAUNCH_PLATFORMS as string[]).includes(x))
    const chosen = platforms.length > 0 ? platforms : ['product_hunt', 'hacker_news', 'indie_hackers'] as LaunchPlatform[]
    let launchAt = s(p.launch_at)
    if (!launchAt) {
      const d = new Date(); while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(7, 1, 0, 0)
      launchAt = d.toISOString()
    }
    const out = await createCampaign({
      workspace: ctx.workspace, name, productUrl,
      tagline: s(p.tagline) || undefined, launchAt, platforms: chosen,
    })
    if ('error' in out) return { summary: `Campaign failed: ${out.error}` }
    return {
      summary: `Launch campaign **${out.name}** created for ${chosen.length} platform(s) on ${new Date(out.launch_at).toLocaleString()}.\n\n[Open war room →](/agents/launch-orchestrator/${out.id})`,
      followups: ['Show me the PH copy', 'What time should I post on HN?'],
    }
  },
}

const TOOL_VIDEO_COACH: OrchestratorTool = {
  name: 'video_coach_script',
  description: 'Generate a 30-60s video script with shot list, VO, B-roll, on-screen text + checklist + tool recs. Scenarios: demo, founder_hook, tutorial, story.',
  params: {
    scenario: { type: 'string', required: true, description: 'demo | founder_hook | tutorial | story' },
    topic: { type: 'string', required: true },
    duration_sec: { type: 'number', description: '15-180, default 60' },
  },
  kind: 'execute',
  async run(p, ctx) {
    const scenario = s(p.scenario) as VideoScenario
    const topic = s(p.topic)
    if (!scenario || !topic) return { summary: 'Need scenario + topic.' }
    const script = await runVideoCoach({
      workspace: ctx.workspace, scenario,
      durationSec: n(p.duration_sec, 60), topic,
    })
    return {
      summary: `Generated **${script.title}** (${script.duration_sec}s, ${script.shot_list.length} shots).\n\n[Open shot list →](/agents/video-coach?ws=${ctx.workspace.id})`,
      followups: ['Show me the first 3 shots', 'Make it shorter (30s)'],
    }
  },
}

const TOOL_START_WORKFLOW: OrchestratorTool = {
  name: 'start_workflow',
  description: 'Start a multi-step GTM workflow (real business process with human gates + tracked artifacts). Available workflow_id: daily_content_sprint, ship_a_feature, find_customers, defend_position.',
  params: {
    workflow_id: { type: 'string', required: true },
    topic: { type: 'string', description: 'For ship_a_feature: what shipped' },
    source_url: { type: 'string', description: 'For ship_a_feature: the URL' },
  },
  kind: 'playbook',
  async run(p, ctx) {
    const { startWorkflow } = await import('@/lib/workflows/runner')
    const id = s(p.workflow_id); if (!id) return { summary: 'Specify workflow_id.' }
    const inputs: Record<string, unknown> = {}
    if (p.topic) inputs.topic = s(p.topic)
    if (p.source_url) inputs.source_url = s(p.source_url)
    const result = await startWorkflow(id, ctx.workspace, { triggeredBy: 'chat', inputs })
    if ('error' in result) return { summary: `Workflow failed: ${result.error}` }
    const link = `/gtm/workflows/${result.runId}`
    if (result.status === 'awaiting_input') {
      return { summary: `Workflow **${id}** paused — needs your input (${result.pauseReason}).\n\n[Open and resume →](${link})`, routeTo: link }
    }
    return { summary: `Workflow **${id}** ${result.status}.\n${result.outcome || ''}\n\n[See artifacts →](${link})`, routeTo: link }
  },
}

// ───────────────── parallel sub-agent dispatcher ────────────────────────────

type SpawnableAgent =
  | 'icp' | 'voice' | 'landing' | 'creator_outreach' | 'cold_email'
  | 'distribution' | 'radar' | 'competitor' | 'geo_audit'

interface SpawnSpec {
  agent: SpawnableAgent
  params?: Record<string, unknown>
}

function isSpawnableAgent(s: unknown): s is SpawnableAgent {
  return typeof s === 'string' && [
    'icp', 'voice', 'landing', 'creator_outreach', 'cold_email',
    'distribution', 'radar', 'competitor', 'geo_audit',
  ].includes(s)
}

async function dispatchSpawn(spec: SpawnSpec, ctx: ToolCtx): Promise<{ agent: string; summary: string; taskId?: string; error?: string }> {
  const traceCtx = {
    workspace_id: ctx.workspace.id,
    conversation_id: ctx.conversationId,
    parent_task_id: ctx.turnTaskId,
    triggered_by: 'chat' as const,
  }
  const p = spec.params ?? {}
  try {
    switch (spec.agent) {
      case 'icp': {
        const { task, result } = await tracedIcp({ workspace: ctx.workspace, brief: s(p.brief) || undefined }, traceCtx)
        return { agent: 'icp', summary: result.positioning?.slice(0, 140) || result.icp_summary?.slice(0, 140) || 'ICP drafted', taskId: task.id }
      }
      case 'voice': {
        const handle = s(p.handle).replace(/^@/, '')
        if (!handle) return { agent: 'voice', summary: 'skipped (no handle)', error: 'handle required' }
        const { task, result } = await tracedVoice({ handle, workspace: ctx.workspace }, traceCtx)
        return { agent: 'voice', summary: result.voice.summary?.slice(0, 140) || `Trained on ${result.sourceCount} samples`, taskId: task.id }
      }
      case 'landing': {
        const url = s(p.url) || ctx.workspace.url
        const { task, result } = await tracedLanding({ workspace: ctx.workspace, url }, traceCtx)
        return { agent: 'landing', summary: `${host(result.url)}: ${result.overall_score}/100 (${result.grade})`, taskId: task.id }
      }
      case 'creator_outreach': {
        const picks = Math.min(8, Math.max(3, n(p.picks, 6)))
        const { task, result } = await tracedCreator({ workspace: ctx.workspace, picks, notes: s(p.notes) || undefined }, traceCtx)
        return { agent: 'creator_outreach', summary: `Drafted ${result.drafts.length} DMs (pool ${result.candidatePoolSize})`, taskId: task.id }
      }
      case 'cold_email': {
        const csv = s(p.targets_csv)
        if (!csv) return { agent: 'cold_email', summary: 'skipped (no target list)', error: 'targets_csv required' }
        const targets = parseTargetCsv(csv)
        if (targets.length === 0) return { agent: 'cold_email', summary: 'skipped (no valid emails)', error: 'no parseable targets' }
        const { task, result } = await tracedColdEmail({ workspace: ctx.workspace, targets, campaignNote: s(p.campaign_note) || undefined }, traceCtx)
        return { agent: 'cold_email', summary: `Drafted ${result.drafts.length} cold emails`, taskId: task.id }
      }
      case 'distribution': {
        const topic = s(p.topic)
        if (!topic) return { agent: 'distribution', summary: 'skipped (no topic)', error: 'topic required' }
        const { task, result } = await tracedDistribution({ workspace: ctx.workspace, topic, sourceUrl: s(p.source_url) || undefined }, traceCtx)
        return { agent: 'distribution', summary: result.post ? `${Object.keys(result.post.variants || {}).length} variants` : 'no variants', taskId: task.id }
      }
      case 'radar': {
        const { task, result } = await tracedRadar({ workspace: ctx.workspace, notes: s(p.notes) || undefined }, traceCtx)
        return { agent: 'radar', summary: `${result.inserted} new leads (scanned ${result.scanned})`, taskId: task.id }
      }
      case 'competitor': {
        const { task, result } = await tracedCompetitor({ workspace: ctx.workspace, diff: true }, traceCtx)
        return { agent: 'competitor', summary: `${result.snapshots} snapshots, ${result.diffs} changes`, taskId: task.id }
      }
      case 'geo_audit': {
        const url = s(p.url) || ctx.workspace.url
        const { task, result } = await tracedGeoAudit(url, traceCtx)
        return { agent: 'geo_audit', summary: `${host(result.url)}: ${result.overall_score}/100 (${result.grade})`, taskId: task.id }
      }
    }
  } catch (err) {
    return { agent: spec.agent, summary: 'failed', error: (err as Error).message }
  }
}

const TOOL_SPAWN_AGENTS: OrchestratorTool = {
  name: 'spawn_agents',
  description: 'Run 2-3 vertical agents IN PARALLEL when the user asked for multiple distinct outputs in one breath (e.g. "draft ICP and audit my landing", "scan radar AND competitors"). Each spawned agent gets its own sub-task linked under this chat turn. Prefer this over chaining 3 tool calls sequentially.',
  params: {
    agents: { type: 'array', required: true, description: 'Array of {agent, params}. agent ∈ icp | voice | landing | creator_outreach | cold_email | distribution | radar | competitor | geo_audit. Max 3.' },
  },
  kind: 'execute',
  async run(p, ctx) {
    const raw = Array.isArray(p.agents) ? p.agents : []
    const specs: SpawnSpec[] = raw
      .map((r): SpawnSpec | null => {
        if (!r || typeof r !== 'object') return null
        const obj = r as Record<string, unknown>
        if (!isSpawnableAgent(obj.agent)) return null
        const params = (obj.params && typeof obj.params === 'object') ? obj.params as Record<string, unknown> : {}
        return { agent: obj.agent, params }
      })
      .filter((x): x is SpawnSpec => x !== null)
      .slice(0, 3)
    if (specs.length === 0) {
      return { summary: 'spawn_agents got no valid agent specs — pick from icp/voice/landing/creator_outreach/cold_email/distribution/radar/competitor/geo_audit.' }
    }
    const settled = await Promise.allSettled(specs.map((spec) => dispatchSpawn(spec, ctx)))
    const lines: string[] = [`Ran ${specs.length} sub-agents in parallel:`]
    for (let i = 0; i < settled.length; i++) {
      const s2 = settled[i]
      if (s2.status === 'fulfilled') {
        const r = s2.value
        const link = r.taskId ? ` [→](/gtm/tasks/${r.taskId})` : ''
        const err = r.error ? ` _(${r.error})_` : ''
        lines.push(`- **${r.agent}** — ${r.summary}${link}${err}`)
      } else {
        lines.push(`- **${specs[i].agent}** — rejected: ${String(s2.reason).slice(0, 120)}`)
      }
    }
    const firstWithTask = settled.find((s2) => s2.status === 'fulfilled' && (s2 as PromiseFulfilledResult<{ taskId?: string }>).value.taskId)
    const lastTaskId = firstWithTask && firstWithTask.status === 'fulfilled' ? (firstWithTask.value as { taskId?: string }).taskId : undefined
    return {
      summary: lines.join('\n'),
      taskId: lastTaskId,
      followups: ['Show me each result', 'Run another batch'],
    }
  },
}

// ── memory tools ──────────────────────────────────────────────────────────

const TOOL_MEMORY_CORE_UPDATE: OrchestratorTool = {
  name: 'memory_core_update',
  description: "Write or rewrite a small piece of CORE memory — a labelled fact that stays in every future prompt for this workspace. Use sparingly, for sticky facts about the founder / product / current goal / do-not-do rules. Pass action='delete' to remove a label. Labels: founder, current_goal, do_not_do, user_preferences, or custom snake_case.",
  params: {
    label: { type: 'string', required: true, description: "Section label, snake_case (e.g. 'founder', 'current_goal')" },
    content: { type: 'string', description: 'New content for that section. Required unless action=delete.' },
    action: { type: 'string', description: "'set' (default) or 'delete'" },
  },
  kind: 'execute',
  async run(p, ctx) {
    const label = s(p.label)
    const action = (s(p.action) || 'set').toLowerCase()
    if (!label) return { summary: 'Memory update needs a label.' }
    if (action === 'delete') {
      const ok = await deleteCore(ctx.workspace.id, label)
      return { summary: ok ? `Forgot core memory [${label}].` : `Couldn't delete [${label}].` }
    }
    const content = s(p.content)
    if (!content) return { summary: `Need content to set core memory [${label}].` }
    const row = await upsertCore(ctx.workspace.id, label, content)
    if (!row) return { summary: `Couldn't save core memory [${label}].` }
    return { summary: `Updated core memory [**${row.label}**]: ${row.content.slice(0, 200)}` }
  },
}

const TOOL_MEMORY_ARCHIVAL_INSERT: OrchestratorTool = {
  name: 'memory_archival_insert',
  description: "Save a longer fact, insight, or decision to ARCHIVAL memory — retrievable later by semantic search. Use when you want to remember something across sessions that doesn't belong in CORE (which is small and always-on). Examples: a customer interview takeaway, a campaign result, a founder anecdote, a specific product nuance.",
  params: {
    content: { type: 'string', required: true, description: 'Free-form fact (≤4000 chars). Self-contained — assume the reader will see it with no other context.' },
    tags: { type: 'array', description: 'Optional string tags for filtering (e.g. ["icp","interview"])' },
  },
  kind: 'execute',
  async run(p, ctx) {
    const content = s(p.content)
    if (!content) return { summary: 'Archival memory needs content.' }
    const tags = Array.isArray(p.tags) ? p.tags.map(String).slice(0, 8) : []
    const row = await insertArchival(ctx.workspace.id, content, { source: 'agent', tags })
    if (!row) return { summary: 'Could not save archival memory.' }
    return { summary: `Saved to archival memory${tags.length ? ` (tags: ${tags.join(', ')})` : ''}: "${row.content.slice(0, 140)}${row.content.length > 140 ? '…' : ''}"` }
  },
}

const TOOL_MEMORY_SEARCH: OrchestratorTool = {
  name: 'memory_search',
  description: "Semantic-search ARCHIVAL memory for facts/notes the agent has saved before. Use when the user references something earlier ('what did I tell you about X'), or proactively when you suspect prior context exists (e.g. before drafting outreach, search for past customer notes). Returns top-K matches with similarity scores.",
  params: {
    query: { type: 'string', required: true, description: 'Natural-language search query' },
    k: { type: 'number', description: '1-10, default 5' },
  },
  kind: 'execute',
  async run(p, ctx) {
    const query = s(p.query)
    if (!query) return { summary: 'Need a query to search memory.' }
    const k = Math.min(10, Math.max(1, n(p.k, 5)))
    const hits = await searchArchival(ctx.workspace.id, query, k)
    if (hits.length === 0) {
      const coreRows = await listCore(ctx.workspace.id)
      const fallback = coreRows.length > 0 ? `\n\nCORE memory has: ${coreRows.map((r) => `[${r.label}]`).join(', ')}` : ''
      return { summary: `No archival matches for "${query.slice(0, 60)}".${fallback}` }
    }
    const lines = hits.map((h, i) => {
      const sim = typeof h.similarity === 'number' ? ` _(${Math.round(h.similarity * 100)}%)_` : ''
      const tagStr = h.tags?.length ? ` · ${h.tags.join(', ')}` : ''
      return `${i + 1}.${sim} ${h.content.slice(0, 240)}${h.content.length > 240 ? '…' : ''}${tagStr}`
    })
    return { summary: `Found ${hits.length} matches:\n${lines.join('\n')}` }
  },
}

// ── Postiz scheduling ────────────────────────────────────────────────────--

function hasPostiz(_ws: Workspace): boolean {
  // Connection lives in a separate table; we can't check it synchronously here.
  // Keep the tool always-visible so the run() can give a helpful "connect first"
  // message rather than the tool being silently hidden.
  return true
}

const TOOL_SCHEDULE_POST: OrchestratorTool = {
  name: 'schedule_post',
  description: "Schedule or immediately publish a social post across the user's connected channels via Postiz. Use when the user says 'post this', 'schedule this for 9am', '排期', '定时发', 'publish to LinkedIn'. Provide the final copy in `content`. Defaults to all connected channels if no platforms given; for a future time pass `when` (ISO or natural like 'tomorrow 9am' already resolved to ISO).",
  params: {
    content: { type: 'string', required: true, description: 'The exact post text to publish.' },
    platforms: { type: 'array', description: "Platform keys to target, e.g. ['x','linkedin','reddit']. Omit = all connected channels." },
    when: { type: 'string', description: 'ISO 8601 timestamp for scheduling. Omit for post-now.' },
  },
  kind: 'execute',
  enabledFor: hasPostiz,
  async run(p, ctx) {
    const content = s(p.content)
    if (!content) return { summary: 'Give me the post text to schedule.' }

    // Have we got ANY way to publish? (any native connection OR a Postiz one)
    const [natives, postiz] = await Promise.all([
      listSocialConnections(ctx.workspace.id),
      getConnection(ctx.workspace.id),
    ])
    if (natives.length === 0 && !postiz) {
      return {
        summary: 'No social accounts connected yet. Open the Scheduler to connect X / LinkedIn / Reddit (or paste a Postiz API key for the long tail).',
        routeTo: `/agents/scheduler?ws=${ctx.workspace.id}`,
        followups: ['Connect X', 'Connect LinkedIn'],
      }
    }

    const platforms = Array.isArray(p.platforms) ? p.platforms.map(String).filter(Boolean) : undefined
    const when = s(p.when) || null
    const result = await unifiedSchedule({
      workspaceId: ctx.workspace.id,
      content,
      platforms,
      when,
      source: 'chat',
      conversationId: ctx.conversationId,
      taskId: ctx.turnTaskId,
    })
    const link = `/agents/scheduler?ws=${ctx.workspace.id}`
    if (!result.ok) {
      return { summary: `${result.summary}\n\n[Open Scheduler →](${link})`, routeTo: result.notConnected ? link : undefined }
    }
    return {
      summary: `${result.summary}\n\n[Open Scheduler →](${link})`,
      data: { created: result.created.length, errors: result.errors.length },
      ui: {
        kind: 'scheduled_post',
        props: {
          summary: result.summary,
          posts: result.created.map((c) => ({ platform: c.platform, content: c.content.slice(0, 280), scheduled_for: c.scheduled_for, status: c.status })),
          scheduler_url: link,
        },
      },
      followups: ['Show my scheduled queue', 'Schedule another'],
    }
  },
}

const TOOL_LIST_SCHEDULED: OrchestratorTool = {
  name: 'list_scheduled_posts',
  description: "Show what's queued or recently posted via Postiz. Use when the user asks 'what's scheduled', '我排了哪些帖子', 'show my queue'.",
  params: { limit: { type: 'number', description: 'Default 10' } },
  kind: 'execute',
  enabledFor: hasPostiz,
  async run(p, ctx) {
    const { listScheduledPosts } = await import('@/lib/postiz/store')
    const limit = Math.min(30, Math.max(1, n(p.limit, 10)))
    const posts = (await listScheduledPosts(ctx.workspace.id, limit))
    if (posts.length === 0) {
      return { summary: 'Nothing scheduled yet. Tell me what to post (and when) and I\'ll queue it.', routeTo: `/agents/scheduler?ws=${ctx.workspace.id}` }
    }
    const lines = posts.slice(0, limit).map((p2) => {
      const glyph = p2.status === 'posted' ? '✓' : p2.status === 'failed' ? '✗' : p2.status === 'scheduled' ? '◷' : '·'
      const when = p2.scheduled_for ? new Date(p2.scheduled_for).toLocaleString() : 'now'
      return `${glyph} **${p2.platform}** · ${when} — ${p2.content.slice(0, 80)}${p2.content.length > 80 ? '…' : ''}`
    })
    return {
      summary: `${posts.length} post(s):\n${lines.join('\n')}\n\n[Open Scheduler →](/agents/scheduler?ws=${ctx.workspace.id})`,
      followups: ['Schedule a new post'],
    }
  },
}

const TOOL_ROUTE_SCHEDULER: OrchestratorTool = {
  name: 'open_scheduler',
  description: 'Send the user to the Scheduler page (connect Postiz, compose, queue).',
  params: {},
  kind: 'route',
  async run(_p, ctx) {
    return { summary: 'Opening the Scheduler…', routeTo: `/agents/scheduler?ws=${ctx.workspace.id}` }
  },
}

const TOOL_ROUTE_POST_ROI: OrchestratorTool = {
  name: 'open_post_roi',
  description: 'Send the user to the Post ROI page.',
  params: {},
  kind: 'route',
  enabledFor: (ws) => Boolean(ws.voice_handle),
  async run(_p, ctx) {
    return { summary: 'Opening Post ROI…', routeTo: `/agents/post-roi?ws=${ctx.workspace.id}` }
  },
}

export const TOOLS: OrchestratorTool[] = [
  TOOL_GET_WORKSPACE,
  TOOL_QUICK_GEO_AUDIT,
  TOOL_TRAIN_VOICE,
  TOOL_RUN_ICP,
  TOOL_LANDING_AUDIT,
  TOOL_RADAR_SCAN,
  TOOL_COMPETITOR_SCAN,
  TOOL_CREATE_AB,
  TOOL_DRAFT_DISTRIBUTION,
  TOOL_DRAFT_CREATORS,
  TOOL_DRAFT_COLD_EMAIL,
  TOOL_POST_ROI,
  TOOL_TREND_DIGEST,
  TOOL_LAUNCH_INIT,
  TOOL_VIDEO_COACH,
  TOOL_LIST_RUNS,
  TOOL_START_WORKFLOW,
  TOOL_SPAWN_AGENTS,
  TOOL_ROUTE_VOICE,
  TOOL_ROUTE_LANDING,
  TOOL_ROUTE_POST_ROI,
  TOOL_START_PLAYBOOK,
  TOOL_MEMORY_CORE_UPDATE,
  TOOL_MEMORY_ARCHIVAL_INSERT,
  TOOL_MEMORY_SEARCH,
  TOOL_SCHEDULE_POST,
  TOOL_LIST_SCHEDULED,
  TOOL_ROUTE_SCHEDULER,
  TOOL_ANSWER_FALLBACK,
]

export function findTool(name: string): OrchestratorTool | undefined {
  return TOOLS.find((t) => t.name === name)
}

/**
 * Tools available to the prompt catalog for a given workspace. Anything with
 * an unsatisfied `enabledFor` predicate is hidden so the classifier doesn't
 * pick it. `findTool()` still resolves disabled tools by name, so cron jobs +
 * slash commands aren't gated by this.
 */
export function enabledTools(ws: Workspace): OrchestratorTool[] {
  return TOOLS.filter((t) => !t.enabledFor || t.enabledFor(ws))
}

/**
 * Render the tool catalog as a prompt section MiniMax can read.
 * Filters by workspace state when `ws` is supplied; otherwise emits all tools
 * (backwards-compatible behaviour for callers that don't have a workspace).
 */
export function toolsPromptCatalog(ws?: Workspace): string {
  const source = ws ? enabledTools(ws) : TOOLS
  return source.map((t) => {
    const params = Object.entries(t.params)
      .map(([k, v]) => `${k}${v.required ? '*' : ''}: ${v.type}${v.description ? ` — ${v.description}` : ''}`)
      .join('; ')
    return `- ${t.name}: ${t.description}\n    params: ${params || '(none)'}`
  }).join('\n')
}

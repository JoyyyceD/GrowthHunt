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

export type ToolKind = 'execute' | 'route' | 'playbook' | 'answer'

export interface ToolCtx {
  workspace: Workspace
  userId: string
  conversationId: string
}

export interface ToolResult {
  /** Plain-text summary shown in the assistant bubble + fed back to MiniMax. */
  summary: string
  /** Optional richer payload for the UI (rendered as a structured card). */
  data?: unknown
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
  run(params: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult>
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
    return { summary: lines.join('\n'), data: ws }
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
  TOOL_LIST_RUNS,
  TOOL_ROUTE_VOICE,
  TOOL_ROUTE_LANDING,
  TOOL_START_PLAYBOOK,
  TOOL_ANSWER_FALLBACK,
]

export function findTool(name: string): OrchestratorTool | undefined {
  return TOOLS.find((t) => t.name === name)
}

/** Render the tool registry as a prompt section MiniMax can read. */
export function toolsPromptCatalog(): string {
  return TOOLS.map((t) => {
    const params = Object.entries(t.params)
      .map(([k, v]) => `${k}${v.required ? '*' : ''}: ${v.type}${v.description ? ` — ${v.description}` : ''}`)
      .join('; ')
    return `- ${t.name}: ${t.description}\n    params: ${params || '(none)'}`
  }).join('\n')
}

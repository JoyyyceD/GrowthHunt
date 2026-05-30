/**
 * Unified schedule service — picks `native` provider when the workspace has
 * matching social_connections, falls back to Postiz when not. Writes a single
 * mirror row per (post × channel) into gtm_scheduled_posts, with `provider`
 * column distinguishing the publish path.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdapter } from './registry'
import { getFirstConnection } from './store'
import { getXKeysForWorkspace } from './x-byo'
import { postTweet } from '@/lib/viralx/x-publish'
import { schedulePost as postizSchedule } from '@/lib/postiz/schedule'
import type { ScheduledPost } from '@/lib/postiz/types'
import type { SocialPlatform } from './types'

export interface UnifiedScheduleArgs {
  workspaceId: string
  content: string
  platforms?: string[]                 // platform keys or 'all'
  when?: string | null                 // ISO; omit/null = post now
  source?: string
  conversationId?: string | null
  taskId?: string | null
  /** Per-platform overrides: { reddit: { subreddit, title, link, flairId }, linkedin: { asOrganizationUrn } } */
  options?: Record<string, Record<string, unknown>>
}

export interface UnifiedScheduleResult {
  ok: boolean
  created: ScheduledPost[]
  errors: Array<{ platform: string; error: string }>
  summary: string
  /** Native platforms with no connection that couldn't be scheduled. */
  notConnected?: string[]
  /** Postiz fallback used (no native connection for these). */
  fallbackPostiz?: string[]
}

function isImmediate(when?: string | null): boolean {
  if (!when) return true
  const t = Date.parse(when)
  return !Number.isFinite(t) || t <= Date.now() + 30_000
}

/** Try to publish immediately via the right path per platform (X = BYO OAuth 1.0a, others = native OAuth 2.0). */
async function publishNow(workspaceId: string, platform: SocialPlatform, content: string, options?: Record<string, unknown>): Promise<{ ok: true; externalId: string; url?: string } | { ok: false; error: string }> {
  if (platform === 'x') {
    const lookup = await getXKeysForWorkspace(workspaceId)
    if (!lookup) return { ok: false, error: 'No X API keys for this workspace — paste them in the Scheduler.' }
    try {
      const r = await postTweet(content, lookup.keys)
      const handle = lookup.screenName?.replace(/^@/, '') || ''
      return { ok: true, externalId: r.id, url: handle ? `https://x.com/${handle}/status/${r.id}` : undefined }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }
  const adapter = getAdapter(platform)
  if (!adapter) return { ok: false, error: `no adapter for ${platform}` }
  const conn = await getFirstConnection(workspaceId, platform)
  if (!conn) return { ok: false, error: `no ${platform} account connected` }
  try {
    const res = await adapter.publish({ conn, content, options: options as Parameters<typeof adapter.publish>[0]['options'] })
    return { ok: true, externalId: res.externalId, url: res.url }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Schedule across platforms. Native preferred; Postiz fallback only if a
 * Postiz connection exists for that workspace.
 */
export async function unifiedSchedule(args: UnifiedScheduleArgs): Promise<UnifiedScheduleResult> {
  const immediate = isImmediate(args.when)
  const date = immediate ? new Date().toISOString() : new Date(args.when as string).toISOString()
  const targets = (args.platforms || ['x', 'linkedin', 'reddit']).map((p) => p.toLowerCase())

  const nativeReady: SocialPlatform[] = []
  const needsPostiz: string[] = []
  for (const p of targets) {
    if (p === 'x') {
      // X uses BYO OAuth 1.0a keys stored per workspace owner in viralx_x_credentials.
      const lookup = await getXKeysForWorkspace(args.workspaceId)
      if (lookup) nativeReady.push('x')
      else needsPostiz.push(p)
    } else if (p === 'linkedin' || p === 'reddit') {
      const conn = await getFirstConnection(args.workspaceId, p)
      if (conn) nativeReady.push(p)
      else needsPostiz.push(p)
    } else {
      needsPostiz.push(p)
    }
  }

  const created: ScheduledPost[] = []
  const errors: UnifiedScheduleResult['errors'] = []
  const admin = createAdminClient()

  // ── native branch ─────────────────────────────────────────────────────────
  for (const platform of nativeReady) {
    // integration_id semantics:
    //   - X: 'viralx_x_credentials:<owner_id>' sentinel (cron resolves via x-byo)
    //   - LinkedIn/Reddit: social_connections.id (cron loads + dispatches adapter)
    let integrationId = ''
    if (platform === 'x') {
      const lookup = await getXKeysForWorkspace(args.workspaceId)
      if (!lookup) continue
      integrationId = 'viralx_x_credentials'
    } else {
      const conn = await getFirstConnection(args.workspaceId, platform)
      if (!conn) continue
      integrationId = conn.id
    }
    const platformOptions = args.options?.[platform] || {}
    if (immediate) {
      const r = await publishNow(args.workspaceId, platform, args.content, platformOptions)
      const status = r.ok ? 'posted' : 'failed'
      const externalId = r.ok ? r.externalId : null
      const error = r.ok ? null : r.error
      const { data } = await admin
        .from('gtm_scheduled_posts')
        .insert({
          workspace_id: args.workspaceId,
          provider: 'native',
          integration_id: integrationId,
          platform,
          content: args.content,
          type: 'now',
          scheduled_for: null,
          status,
          external_post_id: externalId,
          error,
          posted_at: r.ok ? new Date().toISOString() : null,
          source: args.source ?? 'chat',
          conversation_id: args.conversationId ?? null,
          task_id: args.taskId ?? null,
          meta: platformOptions,
        })
        .select('*')
        .single()
      if (data) created.push(data as ScheduledPost)
      if (!r.ok) errors.push({ platform, error: r.error })
    } else {
      // queue — the publish cron will fire it at scheduled_for
      const { data } = await admin
        .from('gtm_scheduled_posts')
        .insert({
          workspace_id: args.workspaceId,
          provider: 'native',
          integration_id: integrationId,
          platform,
          content: args.content,
          type: 'schedule',
          scheduled_for: date,
          status: 'scheduled',
          source: args.source ?? 'chat',
          conversation_id: args.conversationId ?? null,
          task_id: args.taskId ?? null,
          meta: platformOptions,
        })
        .select('*')
        .single()
      if (data) created.push(data as ScheduledPost)
    }
  }

  // ── postiz fallback for platforms without native connection ───────────────
  let fallbackUsed: string[] = []
  if (needsPostiz.length > 0) {
    const r = await postizSchedule({
      workspaceId: args.workspaceId,
      content: args.content,
      platforms: needsPostiz,
      when: immediate ? null : date,
      source: args.source,
      conversationId: args.conversationId,
      taskId: args.taskId,
    })
    if (r.ok) {
      created.push(...r.created)
      fallbackUsed = needsPostiz
    } else if (!r.notConnected) {
      r.errors.forEach((e) => errors.push({ platform: e.platform, error: e.error }))
    }
  }

  const platformsList = [...new Set(created.map((c) => c.platform))]
  const when = immediate ? 'now' : new Date(date).toLocaleString()
  const summary = created.length
    ? `${immediate ? 'Posted' : 'Scheduled'} to ${platformsList.join(', ')} (${when})${errors.length ? ` — ${errors.length} channel(s) failed` : ''}.`
    : (needsPostiz.length === targets.length
        ? `No connected accounts for ${targets.join(', ')}. Connect them on the Scheduler page.`
        : `Failed: ${errors.map((e) => `${e.platform}: ${e.error}`).join('; ')}`)

  return {
    ok: created.length > 0,
    created,
    errors,
    summary,
    notConnected: needsPostiz.length === targets.length ? needsPostiz : undefined,
    fallbackPostiz: fallbackUsed.length ? fallbackUsed : undefined,
  }
}

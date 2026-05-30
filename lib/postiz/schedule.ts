/**
 * Scheduling service — the single code path that hands a post to Postiz and
 * mirrors it locally. Shared by the orchestrator `schedule_post` tool and the
 * scheduler UI's POST /api/postiz/posts route.
 */
import { createPost } from './client'
import { getCreds, listCachedIntegrations, insertScheduledPost } from './store'
import type { ScheduledPost } from './types'

export interface ScheduleArgs {
  workspaceId: string
  content: string
  /** Either explicit integration ids, or platform keys to resolve from cache. */
  integrationIds?: string[]
  platforms?: string[]
  /** ISO timestamp; omit/null = post now. */
  when?: string | null
  source?: string
  conversationId?: string | null
  taskId?: string | null
}

export interface ScheduleResult {
  ok: boolean
  created: ScheduledPost[]
  errors: Array<{ integration_id: string; platform: string; error: string }>
  /** Set when the workspace has no Postiz connection yet. */
  notConnected?: boolean
  /** Platform keys that had no matching connected channel. */
  missingPlatforms?: string[]
  summary: string
}

function isImmediate(when?: string | null): boolean {
  if (!when) return true
  const t = Date.parse(when)
  return !Number.isFinite(t) || t <= Date.now() + 30_000
}

export async function schedulePost(args: ScheduleArgs): Promise<ScheduleResult> {
  const creds = await getCreds(args.workspaceId)
  if (!creds) {
    return { ok: false, created: [], errors: [], notConnected: true, summary: 'No Postiz connection for this workspace yet — connect one on the Scheduler page first.' }
  }

  const cached = await listCachedIntegrations(args.workspaceId)
  const byId = new Map(cached.map((c) => [c.integration_id, c]))
  const byPlatform = new Map<string, typeof cached[number]>()
  for (const c of cached) if (!c.disabled && !byPlatform.has(c.platform)) byPlatform.set(c.platform, c)

  // Resolve the target integration ids.
  const targets: Array<{ integration_id: string; platform: string }> = []
  const missingPlatforms: string[] = []

  if (args.integrationIds?.length) {
    for (const id of args.integrationIds) {
      const c = byId.get(id)
      if (c) targets.push({ integration_id: id, platform: c.platform })
      else targets.push({ integration_id: id, platform: 'unknown' })
    }
  } else if (args.platforms?.length) {
    for (const p of args.platforms) {
      const c = byPlatform.get(p.toLowerCase())
      if (c) targets.push({ integration_id: c.integration_id, platform: c.platform })
      else missingPlatforms.push(p)
    }
  } else {
    // Default: all connected, enabled channels.
    for (const c of cached) if (!c.disabled) targets.push({ integration_id: c.integration_id, platform: c.platform })
  }

  if (targets.length === 0) {
    return {
      ok: false, created: [], errors: [], missingPlatforms,
      summary: missingPlatforms.length
        ? `None of these platforms are connected in Postiz: ${missingPlatforms.join(', ')}. Connect them on the Scheduler page.`
        : 'No connected Postiz channels to post to.',
    }
  }

  const immediate = isImmediate(args.when)
  const type = immediate ? 'now' : 'schedule'
  const date = immediate ? new Date().toISOString() : new Date(args.when as string).toISOString()

  const created: ScheduledPost[] = []
  const errors: ScheduleResult['errors'] = []

  for (const t of targets) {
    try {
      const { postizPostId } = await createPost(creds, {
        content: args.content,
        integrationId: t.integration_id,
        platform: t.platform,
        type,
        date,
      })
      const row = await insertScheduledPost({
        workspaceId: args.workspaceId,
        postizPostId,
        integrationId: t.integration_id,
        platform: t.platform,
        content: args.content,
        type,
        scheduledFor: immediate ? null : date,
        status: immediate ? 'posted' : 'scheduled',
        source: args.source ?? 'chat',
        conversationId: args.conversationId ?? null,
        taskId: args.taskId ?? null,
      })
      if (row) created.push(row)
    } catch (e) {
      errors.push({ integration_id: t.integration_id, platform: t.platform, error: e instanceof Error ? e.message : String(e) })
    }
  }

  const when = immediate ? 'now' : new Date(date).toLocaleString()
  const platforms = [...new Set(created.map((c) => c.platform))]
  const summary = created.length
    ? `${immediate ? 'Posted' : 'Scheduled'} to ${platforms.join(', ')} (${when})${errors.length ? ` — ${errors.length} channel(s) failed` : ''}.`
    : `Failed to ${immediate ? 'post' : 'schedule'}: ${errors.map((e) => `${e.platform}: ${e.error}`).join('; ')}`

  return { ok: created.length > 0, created, errors, missingPlatforms: missingPlatforms.length ? missingPlatforms : undefined, summary }
}

/**
 * Postiz mirror persistence — service-role helpers.
 *
 * Reads/writes postiz_connections, postiz_integrations, gtm_scheduled_posts.
 * End-user mutations from the browser should still go through createServerClient
 * so RLS enforces ownership; these admin helpers are for the orchestrator tool,
 * the sync cron, and server actions that already know the workspace.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { PostizConnection, PostizIntegration, ScheduledPost } from './types'
import type { PostizCreds } from './client'

// ── connection ──────────────────────────────────────────────────────────────

export async function getConnection(workspaceId: string): Promise<PostizConnection | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('postiz_connections')
    .select('workspace_id, api_url, api_key, label, last_synced_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return (data as PostizConnection) ?? null
}

export async function getCreds(workspaceId: string): Promise<PostizCreds | null> {
  const conn = await getConnection(workspaceId)
  if (!conn?.api_key || !conn?.api_url) return null
  return { apiUrl: conn.api_url, apiKey: conn.api_key }
}

export async function saveConnection(workspaceId: string, apiUrl: string, apiKey: string, label?: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('postiz_connections').upsert({
    workspace_id: workspaceId,
    api_url: apiUrl,
    api_key: apiKey,
    label: label ?? null,
  })
  if (error) console.error('[postiz] saveConnection failed:', error.message)
  return !error
}

export async function deleteConnection(workspaceId: string): Promise<boolean> {
  const admin = createAdminClient()
  // Also clear the cached channels so a stale list can't linger after
  // disconnect. Scheduled-post history is intentionally preserved.
  await admin.from('postiz_integrations').delete().eq('workspace_id', workspaceId)
  const { error } = await admin.from('postiz_connections').delete().eq('workspace_id', workspaceId)
  return !error
}

export async function markSynced(workspaceId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('postiz_connections').update({ last_synced_at: new Date().toISOString() }).eq('workspace_id', workspaceId)
}

// ── integrations cache ───────────────────────────────────────────────────────

export async function cacheIntegrations(workspaceId: string, integrations: PostizIntegration[]): Promise<void> {
  const admin = createAdminClient()
  // Replace the cache wholesale so de-linked channels disappear.
  await admin.from('postiz_integrations').delete().eq('workspace_id', workspaceId)
  if (integrations.length === 0) return
  await admin.from('postiz_integrations').insert(
    integrations.map((i) => ({
      workspace_id: workspaceId,
      integration_id: i.integration_id,
      platform: i.platform,
      name: i.name,
      picture: i.picture,
      disabled: i.disabled,
      raw: i as unknown as Record<string, unknown>,
    })),
  )
}

export async function listCachedIntegrations(workspaceId: string): Promise<PostizIntegration[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('postiz_integrations')
    .select('integration_id, platform, name, picture, disabled')
    .eq('workspace_id', workspaceId)
    .order('platform', { ascending: true })
  return (data || []) as PostizIntegration[]
}

/** Resolve human platform names → integration ids using the cache. */
export async function resolveIntegrationIds(workspaceId: string, platforms: string[]): Promise<{ ids: string[]; byPlatform: Record<string, string>; missing: string[] }> {
  const cached = await listCachedIntegrations(workspaceId)
  const byPlatform: Record<string, string> = {}
  for (const c of cached) {
    if (!c.disabled && !byPlatform[c.platform]) byPlatform[c.platform] = c.integration_id
  }
  const ids: string[] = []
  const missing: string[] = []
  for (const p of platforms) {
    const key = p.toLowerCase()
    if (byPlatform[key]) ids.push(byPlatform[key])
    else missing.push(p)
  }
  return { ids, byPlatform, missing }
}

// ── scheduled posts mirror ───────────────────────────────────────────────────

function hydratePost(row: Record<string, unknown>): ScheduledPost {
  return {
    id: row.id as string,
    workspace_id: row.workspace_id as string,
    postiz_post_id: (row.postiz_post_id as string | null) ?? null,
    integration_id: row.integration_id as string,
    platform: row.platform as string,
    content: (row.content as string) || '',
    media: (row.media as ScheduledPost['media']) ?? [],
    type: (row.type as ScheduledPost['type']) ?? 'schedule',
    scheduled_for: (row.scheduled_for as string | null) ?? null,
    status: (row.status as ScheduledPost['status']) ?? 'scheduled',
    posted_at: (row.posted_at as string | null) ?? null,
    external_post_id: (row.external_post_id as string | null) ?? null,
    error: (row.error as string | null) ?? null,
    source: (row.source as string) ?? 'chat',
    conversation_id: (row.conversation_id as string | null) ?? null,
    task_id: (row.task_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export interface InsertScheduledPostInput {
  workspaceId: string
  postizPostId: string | null
  integrationId: string
  platform: string
  content: string
  media?: ScheduledPost['media']
  type: ScheduledPost['type']
  scheduledFor: string | null
  status: ScheduledPost['status']
  source?: string
  conversationId?: string | null
  taskId?: string | null
  error?: string | null
}

export async function insertScheduledPost(input: InsertScheduledPostInput): Promise<ScheduledPost | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gtm_scheduled_posts')
    .insert({
      workspace_id: input.workspaceId,
      postiz_post_id: input.postizPostId,
      integration_id: input.integrationId,
      platform: input.platform,
      content: input.content,
      media: input.media ?? [],
      type: input.type,
      scheduled_for: input.scheduledFor,
      status: input.status,
      source: input.source ?? 'chat',
      conversation_id: input.conversationId ?? null,
      task_id: input.taskId ?? null,
      error: input.error ?? null,
      posted_at: input.status === 'posted' ? new Date().toISOString() : null,
    })
    .select('*')
    .single()
  if (error) { console.error('[postiz] insertScheduledPost failed:', error.message); return null }
  return hydratePost(data)
}

export async function listScheduledPosts(workspaceId: string, limit = 100): Promise<ScheduledPost[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('gtm_scheduled_posts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('scheduled_for', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).map(hydratePost)
}

export async function updatePostStatus(id: string, patch: Partial<Pick<ScheduledPost, 'status' | 'posted_at' | 'external_post_id' | 'error'>>): Promise<void> {
  const admin = createAdminClient()
  await admin.from('gtm_scheduled_posts').update(patch).eq('id', id)
}

/**
 * Best-effort send confirmation. Postiz's public API doesn't expose a stable
 * per-post status endpoint, so the sync cron optimistically transitions
 * 'scheduled' rows whose time has passed to 'posted'. (Hard confirmation is a
 * Day-4 item once the analytics/list endpoint is validated against a live
 * instance.)
 */
export async function markDueAsPosted(graceMs = 60_000): Promise<number> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - graceMs).toISOString()
  const { data } = await admin
    .from('gtm_scheduled_posts')
    .update({ status: 'posted', posted_at: new Date().toISOString() })
    .eq('status', 'scheduled')
    .lte('scheduled_for', cutoff)
    .not('scheduled_for', 'is', null)
    .select('id')
  return data?.length ?? 0
}

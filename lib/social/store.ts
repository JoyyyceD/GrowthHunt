/**
 * social_connections persistence — service-role helpers.
 * Browser-side mutations go through createServerClient (RLS enforces ownership).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { SocialConnection, SocialPlatform } from './types'

function hydrate(row: Record<string, unknown>): SocialConnection {
  return {
    id: row.id as string,
    workspace_id: row.workspace_id as string,
    platform: row.platform as SocialPlatform,
    account_id: (row.account_id as string | null) ?? null,
    account_handle: (row.account_handle as string | null) ?? null,
    access_token: row.access_token as string,
    refresh_token: (row.refresh_token as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    scopes: (row.scopes as string | null) ?? null,
    meta: (row.meta as Record<string, unknown>) ?? {},
  }
}

export interface UpsertInput {
  workspaceId: string
  platform: SocialPlatform
  accountId: string | null
  accountHandle: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  scopes: string | null
  meta: Record<string, unknown>
}

export async function upsertConnection(input: UpsertInput): Promise<SocialConnection | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('social_connections')
    .upsert({
      workspace_id: input.workspaceId,
      platform: input.platform,
      account_id: input.accountId,
      account_handle: input.accountHandle,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      expires_at: input.expiresAt,
      scopes: input.scopes,
      meta: input.meta,
      needs_reconnect: false,
      reconnect_reason: null,
    }, { onConflict: 'workspace_id,platform,account_id' })
    .select('*')
    .single()
  if (error) { console.error('[social] upsert failed:', error.message); return null }
  return hydrate(data)
}

export async function listConnections(workspaceId: string): Promise<Array<SocialConnection & { needs_reconnect: boolean; reconnect_reason: string | null }>> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('platform', { ascending: true })
  return (data || []).map((r) => ({ ...hydrate(r), needs_reconnect: Boolean(r.needs_reconnect), reconnect_reason: (r.reconnect_reason as string | null) ?? null }))
}

export async function getConnectionById(id: string): Promise<SocialConnection | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('social_connections').select('*').eq('id', id).maybeSingle()
  return data ? hydrate(data) : null
}

/** Get the first connection for a workspace+platform (when account is implicit). */
export async function getFirstConnection(workspaceId: string, platform: SocialPlatform): Promise<SocialConnection | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('social_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .eq('needs_reconnect', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data ? hydrate(data) : null
}

export async function deleteConnection(id: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('social_connections').delete().eq('id', id)
  return !error
}

export async function markReconnectNeeded(id: string, reason: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('social_connections').update({ needs_reconnect: true, reconnect_reason: reason }).eq('id', id)
}

export async function updateTokens(id: string, patch: { access_token?: string; refresh_token?: string | null; expires_at?: string | null; scopes?: string | null }): Promise<void> {
  const admin = createAdminClient()
  await admin.from('social_connections').update(patch).eq('id', id)
}

/** Connections whose token expires within `withinMinutes` and is refreshable. */
export async function findExpiring(withinMinutes = 10): Promise<SocialConnection[]> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() + withinMinutes * 60_000).toISOString()
  const { data } = await admin
    .from('social_connections')
    .select('*')
    .lt('expires_at', cutoff)
    .not('refresh_token', 'is', null)
    .eq('needs_reconnect', false)
    .limit(50)
  return (data || []).map(hydrate)
}

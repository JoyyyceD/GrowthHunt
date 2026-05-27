/**
 * Workspace persistence — service-role helpers so server-side agents can
 * read/update workspaces by id without depending on the request's auth.
 *
 * For end-user mutations from the browser, prefer createServerClient() so
 * RLS enforces ownership; these helpers are for cron jobs and agent flows
 * that already know which workspace they're touching.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { Workspace, WorkspaceCreate, WorkspacePatch } from './types'

function normalizeUrl(input: string): string {
  let s = input.trim()
  if (!s) return s
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  try {
    const u = new URL(s)
    return `${u.origin}${u.pathname.replace(/\/+$/, '') || ''}`
  } catch {
    return s
  }
}

function hydrate(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as string,
    owner_id: (row.owner_id as string | null) ?? null,
    name: (row.name as string) || '',
    url: (row.url as string) || '',
    one_liner: (row.one_liner as string | null) ?? null,
    icp_summary: (row.icp_summary as string | null) ?? null,
    icp_segments: (row.icp_segments as Workspace['icp_segments']) ?? [],
    positioning: (row.positioning as string | null) ?? null,
    key_messages: (row.key_messages as string[]) ?? [],
    competitors: (row.competitors as Workspace['competitors']) ?? [],
    voice: (row.voice as Workspace['voice']) ?? null,
    voice_handle: (row.voice_handle as string | null) ?? null,
    brand_color: (row.brand_color as string | null) ?? null,
    emoji: (row.emoji as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listWorkspacesForOwner(ownerId: string): Promise<Workspace[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gtm_workspaces')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[workspace] list failed:', error.message)
    return []
  }
  return (data || []).map(hydrate)
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gtm_workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return hydrate(data)
}

export async function createWorkspace(ownerId: string, input: WorkspaceCreate): Promise<Workspace> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gtm_workspaces')
    .insert({
      owner_id: ownerId,
      name: input.name.trim(),
      url: normalizeUrl(input.url),
      one_liner: input.one_liner?.trim() || null,
      brand_color: input.brand_color || null,
      emoji: input.emoji || null,
    })
    .select('*')
    .single()
  if (error) {
    console.error('[workspace] create failed:', error.message)
    throw new Error(error.message)
  }
  const ws = hydrate(data)
  // Auto-fire the onboarding playbook (fire-and-forget; do not block the request)
  void (async () => {
    try {
      const { runPlaybook } = await import('@/lib/playbooks/runner')
      await runPlaybook('onboarding', ws, { triggeredBy: 'event' })
    } catch (err) {
      console.error('[workspace] onboarding playbook failed:', (err as Error).message)
    }
  })()
  return ws
}

export async function patchWorkspace(id: string, patch: WorkspacePatch): Promise<Workspace | null> {
  const admin = createAdminClient()
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name = patch.name.trim()
  if (patch.url !== undefined) update.url = normalizeUrl(patch.url)
  if (patch.one_liner !== undefined) update.one_liner = patch.one_liner?.trim() || null
  if (patch.icp_summary !== undefined) update.icp_summary = patch.icp_summary
  if (patch.icp_segments !== undefined) update.icp_segments = patch.icp_segments
  if (patch.positioning !== undefined) update.positioning = patch.positioning
  if (patch.key_messages !== undefined) update.key_messages = patch.key_messages
  if (patch.competitors !== undefined) update.competitors = patch.competitors
  if (patch.voice !== undefined) update.voice = patch.voice
  if (patch.voice_handle !== undefined) update.voice_handle = patch.voice_handle
  if (patch.brand_color !== undefined) update.brand_color = patch.brand_color
  if (patch.emoji !== undefined) update.emoji = patch.emoji

  const { data, error } = await admin
    .from('gtm_workspaces')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error('[workspace] patch failed:', error.message)
    return null
  }
  return hydrate(data)
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('gtm_workspaces')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[workspace] delete failed:', error.message)
    return false
  }
  return true
}

/**
 * Per-workspace MCP API keys.
 *
 * Issuance: a user provisions a key from the Scheduler page (or via API);
 * the key is `gh_mcp_<random>` and identifies which workspace an external
 * agent acts on. We never reveal the previous key (no recovery — regenerate
 * if lost).
 */
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export function generateMcpKey(): string {
  return 'gh_mcp_' + crypto.randomBytes(24).toString('base64url')
}

/** Look up a workspace by its MCP key. Returns null if not found. */
export async function workspaceForKey(key: string): Promise<{ id: string; owner_id: string | null; name: string } | null> {
  if (!key || !key.startsWith('gh_mcp_')) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('gtm_workspaces')
    .select('id, owner_id, name')
    .eq('mcp_api_key', key)
    .maybeSingle()
  return (data as { id: string; owner_id: string | null; name: string } | null) ?? null
}

export async function setKeyForWorkspace(workspaceId: string, key: string | null): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('gtm_workspaces').update({ mcp_api_key: key }).eq('id', workspaceId)
  return !error
}

export async function getKeyForWorkspace(workspaceId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('gtm_workspaces').select('mcp_api_key').eq('id', workspaceId).maybeSingle()
  return (data?.mcp_api_key as string | null) ?? null
}

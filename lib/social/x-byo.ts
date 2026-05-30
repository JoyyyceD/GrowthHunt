/**
 * Bring-your-own X credentials helpers.
 *
 * For X, GrowthHunt does NOT host a shared OAuth app — each end user
 * registers their own X developer app, pays their own X bill, and pastes
 * their 4 OAuth 1.0a keys into the Scheduler. We sign every POST /2/tweets
 * with that user's keys (see lib/viralx/x-publish.ts) so all quota and cost
 * are billed to them.
 *
 * Persistence lives in `viralx_x_credentials` keyed by user_id. This module
 * looks up creds by workspace owner (since the Scheduler operates per
 * workspace and the workspace has an owner_id).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { OAuth1Keys } from '@/lib/viralx/x-publish'

export interface XByoLookup {
  keys: OAuth1Keys
  screenName: string | null
}

/** Find the workspace owner's X creds; returns null if not connected. */
export async function getXKeysForWorkspace(workspaceId: string): Promise<XByoLookup | null> {
  const admin = createAdminClient()
  // 1. workspace -> owner_id
  const { data: ws } = await admin
    .from('gtm_workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws?.owner_id) return null
  // 2. owner_id -> 4 keys
  const { data: c } = await admin
    .from('viralx_x_credentials')
    .select('consumer_key, consumer_secret, access_token, access_token_secret, x_screen_name')
    .eq('user_id', ws.owner_id)
    .maybeSingle()
  if (!c?.consumer_key || !c?.consumer_secret || !c?.access_token || !c?.access_token_secret) return null
  return {
    keys: {
      consumer_key: c.consumer_key,
      consumer_secret: c.consumer_secret,
      access_token: c.access_token,
      access_token_secret: c.access_token_secret,
    },
    screenName: c.x_screen_name ?? null,
  }
}

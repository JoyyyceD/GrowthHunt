/**
 * Cron: unified scheduler worker.
 *
 * Every tick (every 5 min via vercel.json):
 *   1. Refresh native tokens that expire within ~10 min (where refreshable).
 *   2. Publish due native posts: scan gtm_scheduled_posts where provider='native'
 *      AND status='scheduled' AND scheduled_for <= now, call adapter.publish(),
 *      write posted/failed + retry counter.
 *   3. Optimistically flip due Postiz posts (true status sync is a future item
 *      once Postiz exposes a stable list endpoint).
 *
 * Auth: Bearer <CRON_SECRET>.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdapter, isSocialPlatform } from '@/lib/social/registry'
import { getPlatformCreds } from '@/lib/social/types'
import { findExpiring, updateTokens, markReconnectNeeded } from '@/lib/social/store'
import { markDueAsPosted } from '@/lib/postiz/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_NATIVE_PER_RUN = 25
const GAP_MS = 400
const MAX_RETRIES = 3

interface DueNativeRow {
  id: string
  workspace_id: string
  platform: string
  content: string
  integration_id: string         // social_connections.id
  retry_count: number | null
  scheduled_for: string | null
}

async function refreshExpiring(): Promise<{ refreshed: number; failed: number }> {
  const list = await findExpiring(10)
  let refreshed = 0
  let failed = 0
  for (const conn of list) {
    if (!isSocialPlatform(conn.platform)) continue
    const adapter = getAdapter(conn.platform)
    if (!adapter?.refresh) continue
    const creds = getPlatformCreds(conn.platform)
    if (!creds || !conn.refresh_token) continue
    try {
      const r = await adapter.refresh({ creds, refreshToken: conn.refresh_token })
      const expiresAt = r.expires_in ? new Date(Date.now() + r.expires_in * 1000).toISOString() : null
      await updateTokens(conn.id, {
        access_token: r.access_token,
        refresh_token: r.refresh_token ?? conn.refresh_token,
        expires_at: expiresAt,
        scopes: r.scope ?? conn.scopes,
      })
      refreshed++
    } catch (e) {
      await markReconnectNeeded(conn.id, `token refresh failed: ${(e as Error).message}`)
      failed++
    }
  }
  return { refreshed, failed }
}

async function publishDueNative(): Promise<{ published: number; failed: number; details: Array<{ id: string; status: 'posted' | 'failed'; error?: string }> }> {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()
  const { data: due } = await admin
    .from('gtm_scheduled_posts')
    .select('id, workspace_id, platform, content, integration_id, retry_count, scheduled_for')
    .eq('provider', 'native')
    .eq('status', 'scheduled')
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(MAX_NATIVE_PER_RUN)
    .returns<DueNativeRow[]>()

  let published = 0
  let failed = 0
  const details: Array<{ id: string; status: 'posted' | 'failed'; error?: string }> = []

  for (const row of due ?? []) {
    const retries = row.retry_count ?? 0
    if (!isSocialPlatform(row.platform)) {
      await admin.from('gtm_scheduled_posts').update({ status: 'failed', error: `unsupported platform: ${row.platform}` }).eq('id', row.id)
      details.push({ id: row.id, status: 'failed', error: 'unsupported platform' })
      failed++
      continue
    }
    const adapter = getAdapter(row.platform)
    if (!adapter) continue
    const { data: conn } = await admin.from('social_connections').select('*').eq('id', row.integration_id).maybeSingle()
    if (!conn || conn.needs_reconnect) {
      await admin.from('gtm_scheduled_posts').update({ status: 'failed', error: conn ? 'account needs reconnect' : 'connection deleted' }).eq('id', row.id)
      details.push({ id: row.id, status: 'failed', error: 'connection unusable' })
      failed++
      continue
    }
    try {
      const res = await adapter.publish({ conn: conn as Parameters<typeof adapter.publish>[0]['conn'], content: row.content })
      await admin.from('gtm_scheduled_posts').update({
        status: 'posted',
        external_post_id: res.externalId,
        posted_at: new Date().toISOString(),
        error: null,
      }).eq('id', row.id)
      published++
      details.push({ id: row.id, status: 'posted' })
    } catch (e) {
      const msg = (e as Error).message
      const isScopeOr401 = /\b(401|403|scope|unauthor)/i.test(msg)
      if (isScopeOr401) {
        await markReconnectNeeded(row.integration_id, msg.slice(0, 240))
      }
      if (retries + 1 >= MAX_RETRIES) {
        await admin.from('gtm_scheduled_posts').update({ status: 'failed', error: msg.slice(0, 500), retry_count: retries + 1 }).eq('id', row.id)
      } else {
        await admin.from('gtm_scheduled_posts').update({ error: msg.slice(0, 500), retry_count: retries + 1 }).eq('id', row.id)
      }
      failed++
      details.push({ id: row.id, status: 'failed', error: msg.slice(0, 200) })
    }
    if (GAP_MS > 0) await new Promise((r) => setTimeout(r, GAP_MS))
  }

  return { published, failed, details }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const refreshed = await refreshExpiring()
  const native = await publishDueNative()
  const postizTransitioned = await markDueAsPosted()
  return NextResponse.json({
    ok: true,
    refresh: refreshed,
    native_published: native.published,
    native_failed: native.failed,
    postiz_transitioned: postizTransitioned,
    details: native.details.slice(0, 20),
  })
}

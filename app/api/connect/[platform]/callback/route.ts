/**
 * GET /api/connect/[platform]/callback?code=…&state=…
 *   Exchanges the OAuth code for tokens, stores them in social_connections,
 *   redirects back to the Scheduler.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getAdapter, isSocialPlatform } from '@/lib/social/registry'
import { getPlatformCreds } from '@/lib/social/types'
import { readStateCookie, clearStateCookie, callbackUrlFor } from '@/lib/social/oauth-state'
import { upsertConnection } from '@/lib/social/store'

export const dynamic = 'force-dynamic'

function back(req: NextRequest, returnTo: string, status: 'connected' | 'error', detail?: string): NextResponse {
  const url = new URL(returnTo, req.url)
  url.searchParams.set('connect', status)
  if (detail) url.searchParams.set('msg', detail.slice(0, 200))
  return NextResponse.redirect(url)
}

function fallbackBack(req: NextRequest, msg: string): NextResponse {
  const u = new URL('/agents/scheduler', req.url)
  u.searchParams.set('connect', 'error')
  u.searchParams.set('msg', msg.slice(0, 200))
  return NextResponse.redirect(u)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params
  if (!isSocialPlatform(platform)) return fallbackBack(req, `${platform} not supported`)
  const adapter = getAdapter(platform)
  if (!adapter) return fallbackBack(req, `${platform} adapter unavailable`)
  const creds = getPlatformCreds(platform)
  if (!creds) return fallbackBack(req, `${platform.toUpperCase()} OAuth app not configured by admin`)

  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login?next=/agents/scheduler', req.url))

  const stash = readStateCookie(req, platform)
  if (!stash) return fallbackBack(req, 'Sign-in session expired — please click Connect again.')

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const errParam = req.nextUrl.searchParams.get('error')
  if (errParam) {
    const r = back(req, stash.returnTo, 'error', `${platform} returned ${errParam}`)
    clearStateCookie(r, platform)
    return r
  }
  if (!code || !state || state !== stash.state) {
    const r = back(req, stash.returnTo, 'error', 'invalid callback (code/state)')
    clearStateCookie(r, platform)
    return r
  }

  const ws = await getWorkspace(stash.workspaceId)
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) {
    return fallbackBack(req, 'forbidden')
  }

  const redirectUri = callbackUrlFor(req, platform)
  let tokens
  try {
    tokens = await adapter.exchangeCode({ creds, redirectUri, code, codeVerifier: stash.codeVerifier })
  } catch (e) {
    const r = back(req, stash.returnTo, 'error', `token exchange failed: ${(e as Error).message}`)
    clearStateCookie(r, platform)
    return r
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  await upsertConnection({
    workspaceId: ws.id,
    platform,
    accountId: tokens.account_id ?? null,
    accountHandle: tokens.account_handle ?? null,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
    scopes: tokens.scope ?? null,
    meta: tokens.meta ?? {},
  })

  const r = back(req, stash.returnTo, 'connected', `${platform}${tokens.account_handle ? ' ' + tokens.account_handle : ''}`)
  clearStateCookie(r, platform)
  return r
}

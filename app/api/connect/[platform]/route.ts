/**
 * GET /api/connect/[platform]?ws=<workspace_id>
 *   Kicks off the OAuth handshake — redirects the user to the platform's
 *   authorize URL. PKCE verifier + state are stashed in an HttpOnly cookie
 *   the callback route reads.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getAdapter, isSocialPlatform } from '@/lib/social/registry'
import { getPlatformCreds } from '@/lib/social/types'
import { randomB64Url, codeChallengeS256, setStateCookie, callbackUrlFor } from '@/lib/social/oauth-state'

export const dynamic = 'force-dynamic'

function backToScheduler(req: NextRequest, wsId: string | null, msg: string): NextResponse {
  const u = new URL(wsId ? `/agents/scheduler?ws=${wsId}` : '/agents/scheduler', req.url)
  u.searchParams.set('connect', 'error')
  u.searchParams.set('msg', msg.slice(0, 200))
  return NextResponse.redirect(u)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params
  const wsId = req.nextUrl.searchParams.get('ws')

  if (!isSocialPlatform(platform)) {
    return backToScheduler(req, wsId, `${platform} is not supported`)
  }
  const adapter = getAdapter(platform)
  if (!adapter) return backToScheduler(req, wsId, `${platform} adapter unavailable`)

  // 1. Auth first — unauth'd users get a friendly redirect to login.
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    const next = wsId ? `/agents/scheduler?ws=${wsId}` : '/agents/scheduler'
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url))
  }
  if (!wsId) return backToScheduler(req, null, 'workspace missing')

  // 2. Workspace ownership.
  const ws = await getWorkspace(wsId)
  if (!ws) return backToScheduler(req, null, 'workspace not found')
  if (ws.owner_id && ws.owner_id !== user.id) return backToScheduler(req, null, 'forbidden')

  // 3. Env creds — admin must have configured the OAuth app for this platform.
  const creds = getPlatformCreds(platform)
  if (!creds) {
    return backToScheduler(req, wsId, `${platform.toUpperCase()} sign-in isn't enabled on this site yet — the admin needs to set its OAuth app credentials.`)
  }

  // 4. Kick off the OAuth handshake.
  const state = randomB64Url(24)
  const verifier = randomB64Url(48)
  const challenge = adapter.usesPkce ? codeChallengeS256(verifier) : undefined
  const redirectUri = callbackUrlFor(req, platform)
  const authorize = adapter.authUrl({ creds, redirectUri, state, codeChallenge: challenge })

  const res = NextResponse.redirect(authorize)
  setStateCookie(res, platform, {
    state, codeVerifier: verifier, workspaceId: ws.id, platform,
    // Optional caller-supplied return path (e.g. /scout/[id]/integrations);
    // same-site only to prevent open redirects.
    returnTo: (() => {
      const rt = req.nextUrl.searchParams.get('returnTo')
      return rt && rt.startsWith('/') && !rt.startsWith('//') ? rt : `/agents/scheduler?ws=${ws.id}`
    })(),
  })
  return res
}

/**
 * OAuth state + PKCE helpers (HttpOnly cookie round-trip).
 *
 * We don't keep the state server-side — it lives in a short-lived signed cookie
 * set on `/api/connect/<platform>` and read back on `/callback`. CSRF safety
 * = the cookie is HttpOnly + SameSite=Lax + a random state value compared.
 */
import crypto from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'

const COOKIE_PREFIX = 'gh_oauth_'
const COOKIE_MAX_AGE = 600 // 10 min

export interface OAuthState {
  state: string
  codeVerifier: string
  workspaceId: string
  platform: string
  returnTo: string
}

export function randomB64Url(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

/** RFC 7636 S256 code challenge from a verifier. */
export function codeChallengeS256(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export function cookieNameFor(platform: string): string {
  return `${COOKIE_PREFIX}${platform}`
}

export function setStateCookie(res: NextResponse, platform: string, payload: OAuthState): void {
  res.cookies.set(cookieNameFor(platform), JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/connect',
    maxAge: COOKIE_MAX_AGE,
  })
}

export function readStateCookie(req: NextRequest, platform: string): OAuthState | null {
  const raw = req.cookies.get(cookieNameFor(platform))?.value
  if (!raw) return null
  try { return JSON.parse(raw) as OAuthState } catch { return null }
}

export function clearStateCookie(res: NextResponse, platform: string): void {
  res.cookies.set(cookieNameFor(platform), '', { path: '/api/connect', maxAge: 0 })
}

/** Build the absolute redirect URI for an inbound request's host. */
export function callbackUrlFor(req: NextRequest, platform: string): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}/api/connect/${platform}/callback`
}

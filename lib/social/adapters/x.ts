/**
 * X (Twitter) adapter — OAuth 2.0 Authorization Code + PKCE, user context.
 *
 * Written from the official X API docs (developer.x.com):
 *   - Authorize:  https://twitter.com/i/oauth2/authorize
 *   - Token:      POST https://api.twitter.com/2/oauth2/token
 *   - Create post: POST https://api.twitter.com/2/tweets   (scope tweet.write)
 *   - Me:         GET  https://api.twitter.com/2/users/me  (scope users.read)
 * Refresh requires the `offline.access` scope.
 *
 * NOTE: X is a confidential client here → token + refresh requests use HTTP
 * Basic auth with clientId:clientSecret, and the publish call uses the user's
 * Bearer access token.
 */
import type { SocialAdapter, OAuthTokenResult, PublishResult, SocialConnection, PlatformAppCreds } from '../types'

const AUTHORIZE = 'https://twitter.com/i/oauth2/authorize'
const TOKEN = 'https://api.twitter.com/2/oauth2/token'
const TWEETS = 'https://api.twitter.com/2/tweets'
const ME = 'https://api.twitter.com/2/users/me'
const SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access']

function basicAuth(creds: PlatformAppCreds): string {
  return 'Basic ' + Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')
}

async function tokenRequest(body: URLSearchParams, creds: PlatformAppCreds): Promise<OAuthTokenResult> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: basicAuth(creds) },
    body,
  })
  if (!res.ok) throw new Error(`X token ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  const j = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }
  return { access_token: j.access_token, refresh_token: j.refresh_token ?? null, expires_in: j.expires_in ?? null, scope: j.scope ?? null }
}

export const xAdapter: SocialAdapter = {
  platform: 'x',
  label: 'X',
  scopes: SCOPES,
  refreshable: true,
  usesPkce: true,

  authUrl({ creds, redirectUri, state, codeChallenge }) {
    const p = new URLSearchParams({
      response_type: 'code',
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      state,
      code_challenge: codeChallenge || 'challenge',
      code_challenge_method: 'S256',
    })
    return `${AUTHORIZE}?${p.toString()}`
  },

  async exchangeCode({ creds, redirectUri, code, codeVerifier }) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: creds.clientId,
      code_verifier: codeVerifier || '',
    })
    const tok = await tokenRequest(body, creds)
    // Fetch identity (handle + id) for display.
    try {
      const me = await fetch(ME, { headers: { authorization: `Bearer ${tok.access_token}` } })
      if (me.ok) {
        const mj = await me.json() as { data?: { id?: string; username?: string; name?: string } }
        tok.account_id = mj.data?.id ?? null
        tok.account_handle = mj.data?.username ? `@${mj.data.username}` : (mj.data?.name ?? null)
      }
    } catch { /* identity is best-effort */ }
    return tok
  },

  async refresh({ creds, refreshToken }) {
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: creds.clientId })
    return tokenRequest(body, creds)
  },

  async publish({ conn, content }): Promise<PublishResult> {
    const res = await fetch(TWEETS, {
      method: 'POST',
      headers: { authorization: `Bearer ${conn.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text: content }),
    })
    if (!res.ok) throw new Error(`X publish ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
    const j = await res.json() as { data?: { id?: string } }
    const id = j.data?.id
    if (!id) throw new Error('X publish returned no tweet id')
    const handle = (conn.account_handle || '').replace(/^@/, '')
    return { externalId: id, url: handle ? `https://x.com/${handle}/status/${id}` : undefined }
  },
}

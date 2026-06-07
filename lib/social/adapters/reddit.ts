/**
 * Reddit adapter — OAuth 2.0 (installed/web app).
 *
 * Written from the official Reddit API docs (github.com/reddit-archive/reddit
 * /wiki/OAuth2 + reddit.com/dev/api):
 *   - Authorize: https://www.reddit.com/api/v1/authorize  (duration=permanent
 *                → returns a refresh_token; scope `submit identity`)
 *   - Token:     POST https://www.reddit.com/api/v1/access_token  (HTTP Basic
 *                with clientId:clientSecret)
 *   - Identity:  GET  https://oauth.reddit.com/api/v1/me
 *   - Publish:   POST https://oauth.reddit.com/api/submit  (kind=self self-post)
 *
 * Reddit REQUIRES a descriptive, unique User-Agent on every request.
 */
import type { SocialAdapter, OAuthTokenResult, PublishResult, PlatformAppCreds, SocialConnection } from '../types'

const AUTHORIZE = 'https://www.reddit.com/api/v1/authorize'
const TOKEN = 'https://www.reddit.com/api/v1/access_token'
const ME = 'https://oauth.reddit.com/api/v1/me'
const SUBMIT = 'https://oauth.reddit.com/api/submit'
const MINE_SUBS = 'https://oauth.reddit.com/subreddits/mine/subscriber'
const LINK_FLAIR = (sub: string) => `https://oauth.reddit.com/r/${sub}/api/link_flair_v2`
const SCOPES = ['submit', 'identity', 'read', 'flair']
const UA = 'web:growthhunt.scheduler:v1 (by /u/growthhunt)'

function basicAuth(creds: PlatformAppCreds): string {
  return 'Basic ' + Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')
}

async function tokenRequest(body: URLSearchParams, creds: PlatformAppCreds): Promise<OAuthTokenResult> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: basicAuth(creds), 'user-agent': UA },
    body,
  })
  if (!res.ok) throw new Error(`Reddit token ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  const j = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }
  return { access_token: j.access_token, refresh_token: j.refresh_token ?? null, expires_in: j.expires_in ?? null, scope: j.scope ?? null }
}

export const redditAdapter: SocialAdapter = {
  platform: 'reddit',
  label: 'Reddit',
  scopes: SCOPES,
  refreshable: true,
  usesPkce: false,

  authUrl({ creds, redirectUri, state }) {
    const p = new URLSearchParams({
      client_id: creds.clientId,
      response_type: 'code',
      state,
      redirect_uri: redirectUri,
      duration: 'permanent',
      scope: SCOPES.join(' '),
    })
    return `${AUTHORIZE}?${p.toString()}`
  },

  async exchangeCode({ creds, redirectUri, code }) {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    const tok = await tokenRequest(body, creds)
    try {
      const me = await fetch(ME, { headers: { authorization: `Bearer ${tok.access_token}`, 'user-agent': UA } })
      if (me.ok) {
        const mj = await me.json() as { id?: string; name?: string }
        tok.account_id = mj.id ?? null
        tok.account_handle = mj.name ? `u/${mj.name}` : null
      }
    } catch { /* best-effort */ }
    return tok
  },

  async refresh({ creds, refreshToken }) {
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
    return tokenRequest(body, creds)
  },

  async publish({ conn, content, options, media }): Promise<PublishResult> {
    // Resolve target via options first, then fall back to content prefix parsing:
    //   options.subreddit / options.title / options.link / options.flairId
    //   OR  "r/sub | Title\n\nbody" content shape (legacy)
    let sr = (options?.subreddit || '').replace(/^r\//, '')
    let title = options?.title || ''
    let body = content
    // Reddit native media upload needs an S3 lease + websocket confirm (flaky).
    // We post media as a link to the public URL, which renders as an image/video
    // post in most clients. An explicit options.link still wins.
    const link = options?.link || (media && media.length ? media[0].url : '')
    const flairId = options?.flairId || ''

    if (!sr || !title) {
      const m = content.match(/^r\/(\w+)\s*\|\s*([^\n]+)\n?([\s\S]*)$/)
      if (m) {
        if (!sr) sr = m[1]
        if (!title) title = m[2].trim()
        body = m[3].trim()
      }
    }
    if (!title) title = content.split('\n')[0].slice(0, 290)
    if (!sr) {
      const handle = (conn.account_handle || '').replace(/^u\//, '')
      sr = handle ? `u_${handle}` : ''
    }
    if (!sr) throw new Error('Reddit: subreddit required (use options.subreddit or "r/sub | Title" prefix).')

    const form = new URLSearchParams({ sr, title: title.slice(0, 290), api_type: 'json' })
    if (link) { form.set('kind', 'link'); form.set('url', link) }
    else      { form.set('kind', 'self'); form.set('text', body) }
    if (flairId) form.set('flair_id', flairId)

    const res = await fetch(SUBMIT, {
      method: 'POST',
      headers: { authorization: `Bearer ${conn.access_token}`, 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
      body: form,
    })
    if (!res.ok) throw new Error(`Reddit publish ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
    const j = await res.json() as { json?: { errors?: unknown[]; data?: { id?: string; url?: string; name?: string } } }
    const errs = j.json?.errors
    if (errs && errs.length) throw new Error(`Reddit publish error: ${JSON.stringify(errs).slice(0, 200)}`)
    const data = j.json?.data
    return { externalId: data?.id || data?.name || 'reddit-post', url: data?.url }
  },
}

/** List the user's subscribed subreddits (for compose UI). */
export async function redditListSubreddits(conn: SocialConnection, limit = 50): Promise<Array<{ name: string; title: string; subscribers: number }>> {
  const url = `${MINE_SUBS}?limit=${Math.min(100, Math.max(1, limit))}`
  const res = await fetch(url, { headers: { authorization: `Bearer ${conn.access_token}`, 'user-agent': UA } })
  if (!res.ok) return []
  const j = await res.json() as { data?: { children?: Array<{ data?: { display_name?: string; title?: string; subscribers?: number } }> } }
  return (j.data?.children ?? []).map((c) => ({
    name: c.data?.display_name ?? '',
    title: c.data?.title ?? '',
    subscribers: c.data?.subscribers ?? 0,
  })).filter((x) => x.name)
}

/** List a subreddit's link flairs (when flair scope granted). */
export async function redditListFlairs(conn: SocialConnection, subreddit: string): Promise<Array<{ id: string; text: string }>> {
  const res = await fetch(LINK_FLAIR(subreddit.replace(/^r\//, '')), { headers: { authorization: `Bearer ${conn.access_token}`, 'user-agent': UA } })
  if (!res.ok) return []
  const j = await res.json().catch(() => []) as Array<{ id?: string; text?: string }>
  return Array.isArray(j) ? j.filter((f) => f.id && f.text).map((f) => ({ id: f.id!, text: f.text! })) : []
}

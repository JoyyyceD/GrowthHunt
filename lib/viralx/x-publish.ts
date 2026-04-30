/**
 * X (Twitter) v2 tweet posting via OAuth 1.0a — server-only.
 *
 * Used by ViralX BYO-token flow: user pastes 4 keys from their X developer
 * app (consumer_key / consumer_secret / access_token / access_token_secret).
 * We sign each POST /2/tweets request with HMAC-SHA1 using node:crypto.
 *
 * NOTE: For POST /2/tweets the JSON body params are NOT included in the OAuth
 * 1.0a signature base string — only oauth_* params are. This matches X's docs
 * for OAuth 1.0a + JSON body endpoints.
 */
import crypto from 'node:crypto'

export interface OAuth1Keys {
  consumer_key: string
  consumer_secret: string
  access_token: string
  access_token_secret: string
}

/** RFC 3986 percent-encoding (encodeURIComponent + extras). */
function pctEnc(s: string): string {
  return encodeURIComponent(s).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function sign(method: string, url: string, params: Record<string, string>, keys: OAuth1Keys): string {
  const sortedParamStr = Object.keys(params)
    .sort()
    .map(k => `${pctEnc(k)}=${pctEnc(params[k])}`)
    .join('&')
  const baseString = `${method.toUpperCase()}&${pctEnc(url)}&${pctEnc(sortedParamStr)}`
  const signingKey = `${pctEnc(keys.consumer_secret)}&${pctEnc(keys.access_token_secret)}`
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
}

function authHeader(params: Record<string, string>): string {
  return (
    'OAuth ' +
    Object.keys(params)
      .sort()
      .map(k => `${pctEnc(k)}="${pctEnc(params[k])}"`)
      .join(', ')
  )
}

export interface PostedTweet {
  id: string
  text: string
}

export async function postTweet(text: string, keys: OAuth1Keys): Promise<PostedTweet> {
  const url = 'https://api.twitter.com/2/tweets'
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: keys.consumer_key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: keys.access_token,
    oauth_version: '1.0',
  }
  oauthParams.oauth_signature = sign('POST', url, oauthParams, keys)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(oauthParams),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`X post failed ${res.status}: ${err.slice(0, 400)}`)
  }
  const data = await res.json().catch(() => null) as { data?: { id?: string; text?: string } } | null
  const id = data?.data?.id
  if (!id) throw new Error('X returned no tweet id')
  return { id, text: data?.data?.text || text }
}

/**
 * Verify credentials by calling GET /2/users/me with OAuth 1.0a.
 * Used by the credentials-save flow to (a) confirm keys work, (b) capture
 * the screen_name they post as.
 */
export async function verifyCredentials(keys: OAuth1Keys): Promise<{ id: string; username: string; name: string }> {
  const url = 'https://api.twitter.com/2/users/me'
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: keys.consumer_key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: keys.access_token,
    oauth_version: '1.0',
  }
  oauthParams.oauth_signature = sign('GET', url, oauthParams, keys)

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: authHeader(oauthParams) },
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`X verify failed ${res.status}: ${err.slice(0, 400)}`)
  }
  const data = await res.json().catch(() => null) as { data?: { id?: string; username?: string; name?: string } } | null
  const u = data?.data
  if (!u?.id || !u?.username) throw new Error('X /users/me returned no user')
  return { id: u.id, username: u.username, name: u.name || u.username }
}

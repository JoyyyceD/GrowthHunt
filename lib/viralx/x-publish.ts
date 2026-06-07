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

function baseOauth(keys: OAuth1Keys): Record<string, string> {
  return {
    oauth_consumer_key: keys.consumer_key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: keys.access_token,
    oauth_version: '1.0',
  }
}

/**
 * Build an OAuth1.0a Authorization header. `requestParams` (query params) ARE
 * part of the signature base but are NOT listed in the header. Multipart binary
 * bodies are never signed, so this works for media/upload too — just pass the
 * non-binary command params here and keep them in the request URL's query.
 */
function authFor(method: string, baseUrl: string, requestParams: Record<string, string>, keys: OAuth1Keys): string {
  const oauthParams = baseOauth(keys)
  oauthParams.oauth_signature = sign(method, baseUrl, { ...oauthParams, ...requestParams }, keys)
  return authHeader(oauthParams)
}

export async function postTweet(text: string, keys: OAuth1Keys, mediaIds?: string[]): Promise<PostedTweet> {
  const url = 'https://api.twitter.com/2/tweets'
  const oauthParams: Record<string, string> = baseOauth(keys)
  oauthParams.oauth_signature = sign('POST', url, oauthParams, keys)

  const payload: { text: string; media?: { media_ids: string[] } } = { text }
  if (mediaIds && mediaIds.length) payload.media = { media_ids: mediaIds.slice(0, 4) }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(oauthParams),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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

// ── Media upload (v1.1 upload.twitter.com, signed with the user's BYO keys) ───
const X_UPLOAD = 'https://upload.twitter.com/1.1/media/upload.json'
const X_CHUNK = 4 * 1024 * 1024            // 4 MB APPEND chunks (X cap is 5MB)

async function xUploadSimple(bytes: Buffer, mime: string, category: string, keys: OAuth1Keys): Promise<string> {
  const params = { media_category: category }
  const auth = authFor('POST', X_UPLOAD, params, keys)
  const form = new FormData()
  form.append('media', new Blob([new Uint8Array(bytes)], { type: mime }))
  const res = await fetch(`${X_UPLOAD}?media_category=${encodeURIComponent(category)}`, {
    method: 'POST', headers: { Authorization: auth }, body: form,
  })
  if (!res.ok) throw new Error(`X media upload ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  const j = await res.json() as { media_id_string?: string }
  if (!j.media_id_string) throw new Error('X media upload returned no media_id')
  return j.media_id_string
}

async function xUploadChunked(bytes: Buffer, mime: string, category: string, keys: OAuth1Keys): Promise<string> {
  // INIT
  const initParams = { command: 'INIT', total_bytes: String(bytes.length), media_type: mime, media_category: category }
  const initAuth = authFor('POST', X_UPLOAD, initParams, keys)
  const initRes = await fetch(`${X_UPLOAD}?${new URLSearchParams(initParams).toString()}`, { method: 'POST', headers: { Authorization: initAuth } })
  if (!initRes.ok) throw new Error(`X upload INIT ${initRes.status}: ${(await initRes.text().catch(() => '')).slice(0, 300)}`)
  const mediaId = ((await initRes.json()) as { media_id_string?: string }).media_id_string
  if (!mediaId) throw new Error('X upload INIT returned no media_id')

  // APPEND (binary part is NOT signed; command params ride in the query string)
  let segment = 0
  for (let off = 0; off < bytes.length; off += X_CHUNK) {
    const chunk = bytes.subarray(off, Math.min(off + X_CHUNK, bytes.length))
    const apParams = { command: 'APPEND', media_id: mediaId, segment_index: String(segment) }
    const apAuth = authFor('POST', X_UPLOAD, apParams, keys)
    const form = new FormData()
    form.append('media', new Blob([new Uint8Array(chunk)]))
    const apRes = await fetch(`${X_UPLOAD}?${new URLSearchParams(apParams).toString()}`, { method: 'POST', headers: { Authorization: apAuth }, body: form })
    if (!apRes.ok) throw new Error(`X upload APPEND ${apRes.status}: ${(await apRes.text().catch(() => '')).slice(0, 300)}`)
    segment++
  }

  // FINALIZE
  const finParams = { command: 'FINALIZE', media_id: mediaId }
  const finAuth = authFor('POST', X_UPLOAD, finParams, keys)
  const finRes = await fetch(`${X_UPLOAD}?${new URLSearchParams(finParams).toString()}`, { method: 'POST', headers: { Authorization: finAuth } })
  if (!finRes.ok) throw new Error(`X upload FINALIZE ${finRes.status}: ${(await finRes.text().catch(() => '')).slice(0, 300)}`)
  let info = (await finRes.json()) as { processing_info?: { state?: string; check_after_secs?: number; error?: { message?: string } } }

  // STATUS poll for video transcode
  let guard = 0
  while (info.processing_info && info.processing_info.state && !['succeeded', 'failed'].includes(info.processing_info.state) && guard < 20) {
    const wait = Math.min(10, info.processing_info.check_after_secs || 2)
    await new Promise((r) => setTimeout(r, wait * 1000))
    const stParams = { command: 'STATUS', media_id: mediaId }
    const stAuth = authFor('GET', X_UPLOAD, stParams, keys)
    const stRes = await fetch(`${X_UPLOAD}?${new URLSearchParams(stParams).toString()}`, { headers: { Authorization: stAuth } })
    if (!stRes.ok) throw new Error(`X upload STATUS ${stRes.status}`)
    info = (await stRes.json()) as typeof info
    guard++
  }
  if (info.processing_info?.state === 'failed') {
    throw new Error(`X media processing failed: ${info.processing_info.error?.message || 'unknown'}`)
  }
  return mediaId
}

/** Upload one media item using the user's BYO OAuth1.0a keys → returns media_id. */
export async function uploadMediaToX(
  item: { url: string; kind: 'image' | 'video' | 'gif'; mime: string; bytes?: number },
  keys: OAuth1Keys,
): Promise<string> {
  const res = await fetch(item.url)
  if (!res.ok) throw new Error(`media fetch ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const mime = item.mime || res.headers.get('content-type') || 'application/octet-stream'

  if (item.kind === 'video') return xUploadChunked(bytes, mime || 'video/mp4', 'tweet_video', keys)
  if (item.kind === 'gif') {
    return bytes.length > X_CHUNK
      ? xUploadChunked(bytes, mime || 'image/gif', 'tweet_gif', keys)
      : xUploadSimple(bytes, mime || 'image/gif', 'tweet_gif', keys)
  }
  return xUploadSimple(bytes, mime || 'image/jpeg', 'tweet_image', keys)
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

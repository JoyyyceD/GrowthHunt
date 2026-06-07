/**
 * LinkedIn adapter — OAuth 2.0 (member authorization).
 *
 * Written from the official LinkedIn docs (learn.microsoft.com/linkedin):
 *   - Authorize: https://www.linkedin.com/oauth/v2/authorization
 *   - Token:     POST https://www.linkedin.com/oauth/v2/accessToken
 *   - Identity:  GET  https://api.linkedin.com/v2/userinfo  (OpenID `sub`)
 *   - Publish:   POST https://api.linkedin.com/v2/ugcPosts
 * Scopes: `openid profile w_member_social` (w_member_social = post on behalf).
 *
 * LinkedIn access tokens last ~60 days; refresh tokens are only issued to apps
 * approved for them, so `refreshable` is false by default (re-connect on expiry).
 */
import type { SocialAdapter, OAuthTokenResult, PublishResult } from '../types'
import type { MediaItem } from '../media'
import { fetchMediaBytes } from '../media'

const AUTHORIZE = 'https://www.linkedin.com/oauth/v2/authorization'
const TOKEN = 'https://www.linkedin.com/oauth/v2/accessToken'
const USERINFO = 'https://api.linkedin.com/v2/userinfo'
const UGC_POSTS = 'https://api.linkedin.com/v2/ugcPosts'
const REGISTER_UPLOAD = 'https://api.linkedin.com/v2/assets?action=registerUpload'
const SCOPES = ['openid', 'profile', 'w_member_social']

/** Register + upload one media item, returning its digitalmediaAsset URN. */
async function uploadLinkedInAsset(token: string, ownerUrn: string, item: MediaItem): Promise<string> {
  const recipe = item.kind === 'video'
    ? 'urn:li:digitalmediaRecipe:feedshare-video'
    : 'urn:li:digitalmediaRecipe:feedshare-image'
  const regRes = await fetch(REGISTER_UPLOAD, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [recipe],
        owner: ownerUrn,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  })
  if (!regRes.ok) throw new Error(`LinkedIn registerUpload ${regRes.status}: ${(await regRes.text().catch(() => '')).slice(0, 200)}`)
  const reg = await regRes.json() as {
    value?: { asset?: string; uploadMechanism?: Record<string, { uploadUrl?: string }> }
  }
  const asset = reg.value?.asset
  const mech = reg.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
  const uploadUrl = mech?.uploadUrl
  if (!asset || !uploadUrl) throw new Error('LinkedIn registerUpload returned no upload URL')

  const { bytes, mime } = await fetchMediaBytes(item.url)
  const putRes = await fetch(uploadUrl, {
    method: 'POST',                                   // LinkedIn's media upload URL accepts POST with raw bytes
    headers: { authorization: `Bearer ${token}`, 'content-type': item.mime || mime },
    body: new Uint8Array(bytes),
  })
  if (!putRes.ok && putRes.status !== 201) {
    throw new Error(`LinkedIn media upload ${putRes.status}: ${(await putRes.text().catch(() => '')).slice(0, 200)}`)
  }
  return asset
}

export const linkedinAdapter: SocialAdapter = {
  platform: 'linkedin',
  label: 'LinkedIn',
  scopes: SCOPES,
  refreshable: false,
  usesPkce: false,

  authUrl({ creds, redirectUri, state }) {
    const p = new URLSearchParams({
      response_type: 'code',
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      state,
    })
    return `${AUTHORIZE}?${p.toString()}`
  },

  async exchangeCode({ creds, redirectUri, code }) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    })
    const res = await fetch(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
    if (!res.ok) throw new Error(`LinkedIn token ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
    const j = await res.json() as { access_token: string; expires_in?: number; scope?: string; refresh_token?: string }
    const out: OAuthTokenResult = { access_token: j.access_token, expires_in: j.expires_in ?? null, scope: j.scope ?? null, refresh_token: j.refresh_token ?? null }
    // Identity → the author URN we need for publishing.
    try {
      const ui = await fetch(USERINFO, { headers: { authorization: `Bearer ${j.access_token}` } })
      if (ui.ok) {
        const u = await ui.json() as { sub?: string; name?: string }
        out.account_id = u.sub ?? null
        out.account_handle = u.name ?? null
        if (u.sub) out.meta = { authorUrn: `urn:li:person:${u.sub}` }
      }
    } catch { /* best-effort */ }
    return out
  },

  async publish({ conn, content, media }): Promise<PublishResult> {
    const authorUrn = (conn.meta?.authorUrn as string | undefined) || (conn.account_id ? `urn:li:person:${conn.account_id}` : null)
    if (!authorUrn) throw new Error('LinkedIn: missing author URN (reconnect the account)')

    // Upload any attached media first, then reference the assets in the share.
    let shareMediaCategory: 'NONE' | 'IMAGE' | 'VIDEO' = 'NONE'
    let mediaBlocks: Array<{ status: string; media: string }> = []
    if (media && media.length) {
      const hasVideo = media.some((m) => m.kind === 'video')
      // LinkedIn shares are single-category: a video can't mix with images.
      const items = hasVideo ? media.filter((m) => m.kind === 'video').slice(0, 1) : media.filter((m) => m.kind !== 'video').slice(0, 9)
      shareMediaCategory = hasVideo ? 'VIDEO' : 'IMAGE'
      const assets = await Promise.all(items.map((it) => uploadLinkedInAsset(conn.access_token, authorUrn, it)))
      mediaBlocks = assets.map((a) => ({ status: 'READY', media: a }))
    }

    const payload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory,
          ...(mediaBlocks.length ? { media: mediaBlocks } : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }
    const res = await fetch(UGC_POSTS, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${conn.access_token}`,
        'content-type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`LinkedIn publish ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
    // LinkedIn returns the new post id in the `x-restli-id` header (or body `id`).
    const id = res.headers.get('x-restli-id') || (await res.json().catch(() => ({})) as { id?: string }).id || ''
    return { externalId: id || 'linkedin-post', url: id ? `https://www.linkedin.com/feed/update/${id}` : undefined }
  },
}

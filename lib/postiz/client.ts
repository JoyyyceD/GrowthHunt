/**
 * Postiz Public API client (server-only).
 *
 * AGPL note: we NEVER import or copy Postiz source — we only talk to a running
 * Postiz instance over its REST API. That keeps GrowthHunt's own code separate
 * and proprietary; Postiz stays a standalone network service.
 *
 * Base URL + key are per-workspace (stored in postiz_connections). Auth header
 * is `Authorization: <apiKey>` (or `Authorization: pos_<oauth>` — same shape).
 *
 * Endpoints used:
 *   GET  /integrations   → connected channels (to resolve integration ids)
 *   POST /posts          → create/schedule a post (type: now|schedule|draft)
 *   POST /upload         → media upload (multipart)
 */
import type { PostizIntegration } from './types'

export interface PostizCreds {
  apiUrl: string   // e.g. https://api.postiz.com/public/v1
  apiKey: string
}

export class PostizError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'PostizError'
    this.status = status
  }
}

function normalizeBase(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, '')
}

async function call<T>(creds: PostizCreds, path: string, init?: RequestInit): Promise<T> {
  const url = `${normalizeBase(creds.apiUrl)}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: creds.apiKey,
        ...(init?.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    })
  } catch (e) {
    throw new PostizError(`Postiz unreachable at ${url}: ${(e as Error).message}`, 0)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new PostizError(`Postiz ${path} failed ${res.status}: ${text.slice(0, 400)}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return (await res.json().catch(() => null)) as T
}

// ── integrations ────────────────────────────────────────────────────────────

interface RawIntegration {
  id?: string
  name?: string
  identifier?: string          // platform key on some Postiz versions
  providerIdentifier?: string  // platform key on others
  picture?: string
  disabled?: boolean
}

/** List connected channels. Tolerant of Postiz version drift in field names. */
export async function listIntegrations(creds: PostizCreds): Promise<PostizIntegration[]> {
  const raw = await call<RawIntegration[] | { integrations?: RawIntegration[] }>(creds, '/integrations')
  const arr: RawIntegration[] = Array.isArray(raw) ? raw : (raw?.integrations ?? [])
  return arr
    .filter((r) => r && r.id)
    .map((r) => ({
      integration_id: String(r.id),
      platform: String(r.providerIdentifier || r.identifier || 'unknown').toLowerCase(),
      name: r.name ?? null,
      picture: r.picture ?? null,
      disabled: Boolean(r.disabled),
    }))
}

// ── posts ─────────────────────────────────────────────────────────────────--

export interface PostizSchedulePayload {
  type: 'now' | 'schedule' | 'draft'
  date: string                 // ISO 8601
  shortLink?: boolean
  tags?: string[]
  posts: Array<{
    integration: { id: string }
    value: Array<{ content: string; image?: Array<{ id: string; path: string }> }>
    settings?: Record<string, unknown>
  }>
}

interface RawPostResponse {
  id?: string
  postId?: string
  // Postiz returns an array of created posts in some versions.
  [k: string]: unknown
}

/**
 * Create a post in Postiz. Returns the Postiz post id when available.
 * `platform` is used to set the per-post `settings.__type` Postiz expects.
 */
export async function createPost(
  creds: PostizCreds,
  args: {
    content: string
    integrationId: string
    platform: string
    type: 'now' | 'schedule' | 'draft'
    date: string
    media?: Array<{ id: string; path: string }>
    shortLink?: boolean
  },
): Promise<{ postizPostId: string | null }> {
  const payload: PostizSchedulePayload = {
    type: args.type,
    date: args.date,
    shortLink: args.shortLink ?? false,
    tags: [],
    posts: [
      {
        integration: { id: args.integrationId },
        value: [{ content: args.content, ...(args.media?.length ? { image: args.media } : {}) }],
        settings: { __type: args.platform },
      },
    ],
  }
  const res = await call<RawPostResponse | RawPostResponse[]>(creds, '/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const first = Array.isArray(res) ? res[0] : res
  const id = first?.id || first?.postId || null
  return { postizPostId: id ? String(id) : null }
}

// ── media ─────────────────────────────────────────────────────────────────--

export async function uploadMedia(creds: PostizCreds, file: Blob, filename: string): Promise<{ id: string; path: string }> {
  const form = new FormData()
  form.append('file', file, filename)
  const res = await call<{ id?: string; path?: string }>(creds, '/upload', { method: 'POST', body: form })
  if (!res?.id || !res?.path) throw new PostizError('Postiz upload returned no id/path', 502)
  return { id: String(res.id), path: String(res.path) }
}

/** Cheap connectivity probe used by the connect flow. */
export async function ping(creds: PostizCreds): Promise<{ ok: boolean; integrations: number; error?: string }> {
  try {
    const integ = await listIntegrations(creds)
    return { ok: true, integrations: integ.length }
  } catch (e) {
    return { ok: false, integrations: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

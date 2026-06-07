/**
 * Shared media types + helpers for the scheduler's image/video support.
 *
 * Media is uploaded once to the `post-media` Supabase Storage bucket and then
 * referenced by every platform adapter at publish time. Each adapter fetches
 * the raw bytes from `url` and uploads them to the platform in that platform's
 * own way (X = OAuth1.0a chunked upload, LinkedIn = assets API, Reddit = media
 * lease or a link-post fallback).
 */

export type MediaKind = 'image' | 'video' | 'gif'

export interface MediaItem {
  id: string            // uuid (also the storage object name stem)
  path: string          // storage path inside the bucket
  url: string           // public URL — used to fetch bytes + as Reddit link
  kind: MediaKind
  mime: string          // e.g. image/png, video/mp4
  bytes?: number
}

export const MEDIA_BUCKET = 'post-media'

/** Allowed upload mime types (kept conservative — what the platforms accept). */
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime']

/** Per-platform media limits we enforce up-front (platforms reject beyond these). */
export const MEDIA_LIMITS = {
  // images
  image: { maxBytes: 5 * 1024 * 1024 },          // 5 MB (X image cap; safe shared floor)
  gif:   { maxBytes: 15 * 1024 * 1024 },         // 15 MB
  // video — X allows ~512MB but indie clips are small; keep a sane shared cap
  video: { maxBytes: 200 * 1024 * 1024 },        // 200 MB
} as const

export function kindFromMime(mime: string): MediaKind | null {
  if (mime === 'image/gif') return 'gif'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/quicktime': 'mov',
  }
  return map[mime] || 'bin'
}

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.includes(mime) || ALLOWED_VIDEO_MIME.includes(mime)
}

/** Validate a coerced MediaItem array coming from a request body. */
export function coerceMediaArray(input: unknown): MediaItem[] {
  if (!Array.isArray(input)) return []
  const out: MediaItem[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const m = raw as Record<string, unknown>
    if (typeof m.url !== 'string' || typeof m.path !== 'string') continue
    const kind = (m.kind as MediaKind) || kindFromMime(String(m.mime || '')) || 'image'
    out.push({
      id: String(m.id || m.path),
      path: m.path,
      url: m.url,
      kind,
      mime: String(m.mime || ''),
      bytes: typeof m.bytes === 'number' ? m.bytes : undefined,
    })
  }
  return out.slice(0, 4)   // platforms cap at ~4 images; keep it bounded
}

/** Fetch the raw bytes of a stored media item (used by publish adapters). */
export async function fetchMediaBytes(url: string): Promise<{ bytes: Buffer; mime: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`media fetch ${res.status} for ${url.slice(0, 120)}`)
  const mime = res.headers.get('content-type') || 'application/octet-stream'
  const ab = await res.arrayBuffer()
  return { bytes: Buffer.from(ab), mime }
}

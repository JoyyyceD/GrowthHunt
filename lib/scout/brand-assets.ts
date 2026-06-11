/**
 * Brand asset fetching (V2 batch A) — pull the site's logo at onboarding and
 * store it in the scout-assets bucket where the Assets page (and future post
 * artwork) picks it up. Best-effort: a missing logo never fails onboarding.
 */
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'scout-assets'
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT = 12_000

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/gif': 'gif',
}

function absolutize(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

/** Candidate logo URLs from the homepage HTML, best first. */
export function extractLogoCandidates(html: string, baseUrl: string): string[] {
  const candidates: string[] = []
  const push = (m: RegExpMatchArray | null) => {
    const href = m?.[1] || m?.[2]
    if (href) {
      const abs = absolutize(href, baseUrl)
      if (abs && !candidates.includes(abs)) candidates.push(abs)
    }
  }
  // apple-touch-icon is usually a clean square logo
  push(html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i))
  push(html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i))
  // explicit icons beat og:image (og is often a wide banner)
  push(html.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i))
  push(html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i))
  push(html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i))
  const fallback = absolutize('/favicon.ico', baseUrl)
  if (fallback && !candidates.includes(fallback)) candidates.push(fallback)
  return candidates
}

export async function fetchAndStoreLogo(workspaceId: string, siteUrl: string): Promise<string | null> {
  const base = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`
  let html = ''
  try {
    const res = await fetch(base, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScoutBot/1.0; +https://growthhunt.ai)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })
    if (res.ok) html = await res.text()
  } catch {
    // fall through with favicon-only candidates
  }

  const admin = createAdminClient()
  for (const candidate of extractLogoCandidates(html, base)) {
    try {
      const res = await fetch(candidate, { signal: AbortSignal.timeout(FETCH_TIMEOUT) })
      if (!res.ok) continue
      const mime = (res.headers.get('content-type') || '').split(';')[0].trim()
      const ext = EXT_BY_MIME[mime]
      if (!ext) continue
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (!bytes.length || bytes.length > MAX_LOGO_BYTES) continue

      const path = `${workspaceId}/logo.${ext}`
      const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: true })
      if (error) continue
      return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    } catch {
      continue
    }
  }
  return null
}

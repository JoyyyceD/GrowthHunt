// In-memory sliding-window rate limiter.  Single-instance only — fine for
// MVP on Vercel since each function instance has its own counter.  Swap
// for Upstash Redis when traffic justifies cross-region accuracy.

type Bucket = { hits: number[]; }

const STORE: Map<string, Bucket> = new Map()

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number }

/**
 * Allow `max` hits per `windowSec` window for the given key.
 * Returns { ok: false, retryAfterSec } when limit exceeded.
 */
export function rateLimit(
  key: string,
  max: number,
  windowSec: number
): LimitResult {
  const now = Date.now()
  const windowMs = windowSec * 1000
  const cutoff = now - windowMs

  const bucket = STORE.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => t > cutoff)

  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0]!
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000)
    STORE.set(key, bucket)
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) }
  }

  bucket.hits.push(now)
  STORE.set(key, bucket)

  // Periodically clean up old buckets
  if (STORE.size > 5000 && Math.random() < 0.01) {
    for (const [k, b] of STORE.entries()) {
      if (b.hits.length === 0 || b.hits[b.hits.length - 1]! < cutoff) {
        STORE.delete(k)
      }
    }
  }

  return { ok: true }
}

// Convenience presets
export const RATE = {
  vote: { max: 30, windowSec: 60 },          // 30 votes/min/IP
  comment: { max: 20, windowSec: 3600 },     // 20 comments/hour/user
  submit: { max: 5, windowSec: 86400 },      // 5 submissions/day/user
  media: { max: 30, windowSec: 3600 },       // 30 uploads/hour/user
}

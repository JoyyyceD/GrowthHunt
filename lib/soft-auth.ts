/**
 * Soft auth: a lightweight "I left my email" session.
 *
 * Uses both localStorage (for display in TopNav) AND a cookie (so the
 * Next.js middleware can read it server-side and gate protected routes).
 *
 * This is intentionally NOT a real auth session — it's just a way to let
 * users into gated content after capturing their email, without a magic
 * link click or password.
 */

const COOKIE_NAME = 'gh-soft-user'
const STORAGE_KEY = 'gh-soft-user'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function setSoftUser(email: string) {
  if (typeof window === 'undefined') return
  const clean = email.trim().toLowerCase()

  // localStorage — for display in TopNav
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: clean, ts: Date.now() }))
  } catch { /* private mode etc */ }

  // Cookie — for server-side middleware checks
  const secure = typeof location !== 'undefined' && location.protocol === 'https:'
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(clean)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${secure ? '; secure' : ''}`
}

export function clearSoftUser() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`
}

/** Returns the soft-user email from localStorage if present (client only). */
export function readSoftUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { email?: string }
    return parsed.email ?? null
  } catch { return null }
}

export const SOFT_AUTH_COOKIE = COOKIE_NAME

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { SOFT_AUTH_COOKIE } from '@/lib/soft-auth'

export type GoogleUser = {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
}

// Returns the Google-authed user, null for soft-auth-only, or redirects to /login.
// Pages that require real auth.uid() (writes) render the upgrade prompt when null.
export async function getGoogleUser(nextPath: string): Promise<GoogleUser | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const meta = user.user_metadata as { full_name?: string; avatar_url?: string } | undefined
    return {
      id: user.id,
      email: user.email ?? null,
      name: meta?.full_name ?? user.email?.split('@')[0] ?? null,
      avatar: meta?.avatar_url ?? null,
    }
  }
  const cookieStore = await cookies()
  if (cookieStore.get(SOFT_AUTH_COOKIE)?.value) return null
  redirect(`/login?next=${encodeURIComponent(nextPath)}`)
}

// Strict version: redirect even soft-auth users.
export async function requireGoogleAuth(nextPath: string): Promise<GoogleUser> {
  const u = await getGoogleUser(nextPath)
  if (!u) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return u
}

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
//
// Name + avatar prefer profiles.display_name / profiles.avatar_url (user-editable
// via /api/me PATCH) over the immutable Google OAuth metadata. This keeps the
// dashboard header, submit-form "by" prefill, and any other display in sync with
// what the user set in Settings.
export async function getGoogleUser(nextPath: string): Promise<GoogleUser | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    const meta = user.user_metadata as { full_name?: string; avatar_url?: string } | undefined
    return {
      id: user.id,
      email: user.email ?? null,
      name: profile?.display_name ?? meta?.full_name ?? user.email?.split('@')[0] ?? null,
      avatar: profile?.avatar_url ?? meta?.avatar_url ?? null,
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

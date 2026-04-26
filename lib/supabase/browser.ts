/**
 * Supabase Browser Client
 * Used in client components (app/login/page.tsx, etc.)
 *
 * IMPORTANT: This client must use cookies (not localStorage) for PKCE flow
 * to work correctly with server-side auth callback.
 */

import { createBrowserClient as createClient } from '@supabase/ssr'

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      // Use Lax to ensure cookies are sent on redirects from Supabase
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // Don't set domain - let browser use current domain
    },
  })
}

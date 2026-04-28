import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Add protected routes here when dashboard is ready
const PROTECTED_PAGE_ROUTES: string[] = ['/dashboard']
// Deep-link prefixes — only sub-paths are gated, the landing stays public
// (e.g. /growth-story is open for SEO, but /growth-story/cursor requires auth)
const PROTECTED_DEEP_PREFIXES: string[] = ['/growth-story/']
const PROTECTED_API_ROUTES: string[] = ['/api/dashboard']
const SOFT_AUTH_COOKIE = 'gh-soft-user'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request: { headers: request.headers } })

  // Skip Supabase entirely if env vars are not configured (e.g. Vercel before vars are set)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Required for PKCE flow — refreshes expired sessions on every request
  await supabase.auth.getUser()

  const isProtectedPage = PROTECTED_PAGE_ROUTES.some(
    r => pathname === r || pathname.startsWith(`${r}/`)
  )
  // Deep prefix: must have content AFTER the prefix to count as protected.
  // /growth-story/cursor is protected; /growth-story (or /growth-story/) is not.
  const isProtectedDeep = PROTECTED_DEEP_PREFIXES.some(
    p => pathname.startsWith(p) && pathname.length > p.length
  )
  const isProtectedApi = PROTECTED_API_ROUTES.some(r => pathname.startsWith(r))

  if (!isProtectedPage && !isProtectedDeep && !isProtectedApi) return response

  const { data: { user } } = await supabase.auth.getUser()
  const hasSoftUser = !!request.cookies.get(SOFT_AUTH_COOKIE)?.value
  const isAuthed = !!user || hasSoftUser

  if (!isAuthed) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Add protected routes here when dashboard is ready
const PROTECTED_PAGE_ROUTES: string[] = ['/dashboard']
// Deep-link prefixes — middleware-level gate (server-side redirect).
// /growth-story/* is intentionally NOT here: those pages render publicly
// (so bots can index the synthesis + deep-dives) and use a client-side
// content gate (lib/site/GatedContent.tsx) for unauthenticated visitors.
const PROTECTED_DEEP_PREFIXES: string[] = []
const PROTECTED_API_ROUTES: string[] = ['/api/dashboard']
const SOFT_AUTH_COOKIE = 'gh-soft-user'

/** Returns true if the Accept-Language header indicates a Chinese-language browser. */
function isChineseBrowser(acceptLanguage: string): boolean {
  return acceptLanguage
    .split(',')
    .map(s => s.split(';')[0].trim().toLowerCase())
    .some(lang => lang === 'zh' || lang.startsWith('zh-'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Language detection for growth-story pages ─────────────────────────────
  // Fully automatic — no manual switcher, no cookie. Accept-Language only.
  const basePath = pathname.match(/^\/growth-story\/([^/]+)$/)    // /growth-story/cursor
  const zhPath   = pathname.match(/^\/growth-story\/([^/]+)\/zh$/) // /growth-story/cursor/zh

  if (basePath || zhPath) {
    const acceptLanguage = request.headers.get('accept-language') ?? ''
    const chinese = isChineseBrowser(acceptLanguage)

    if (basePath && chinese) {
      const url = request.nextUrl.clone()
      url.pathname = `${pathname}/zh`
      return NextResponse.redirect(url, { status: 307 })
    }

    if (zhPath && !chinese) {
      const url = request.nextUrl.clone()
      url.pathname = `/growth-story/${zhPath[1]}`
      return NextResponse.redirect(url, { status: 307 })
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

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

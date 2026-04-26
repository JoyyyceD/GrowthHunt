import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Add protected routes here when dashboard is ready
const PROTECTED_PAGE_ROUTES: string[] = ['/dashboard']
const PROTECTED_API_ROUTES: string[] = ['/api/dashboard']

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
  const isProtectedApi = PROTECTED_API_ROUTES.some(r => pathname.startsWith(r))

  if (!isProtectedPage && !isProtectedApi) return response

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
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

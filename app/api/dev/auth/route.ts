/**
 * POST /api/dev/auth — localhost-only auth bypass for local development.
 *
 * Solves the chicken-and-egg where Supabase's OAuth allow list points at the
 * old `app.growthhunt.ai` deployment, so Google OAuth can't redirect back to
 * localhost. This route uses the service role to:
 *
 *   1. Ensure a user exists for the given email (creates if missing).
 *   2. Generate a magic-link `token_hash` via admin API (we never email it).
 *   3. Call `supabase.auth.verifyOtp({ type:'magiclink', token_hash })` on a
 *      cookie-aware SSR client — this sets the real session cookies on the
 *      response so the subsequent /gtm request is authenticated.
 *
 * Guards:
 *   - NODE_ENV must NOT be 'production'.
 *   - Host header must be localhost / 127.0.0.1 / 0.0.0.0.
 *
 * Both guards must hold; the route 403s otherwise. The service role key is
 * already loaded server-side; this just plumbs it into a verify call.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSsrClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev login disabled in production' }, { status: 403 })
  }
  const host = (req.headers.get('host') || '').split(':')[0]
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.localhost')
  if (!isLocal) {
    return NextResponse.json({ error: 'dev login only available on localhost' }, { status: 403 })
  }

  let body: { email?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const email = body.email?.trim().toLowerCase() || ''
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'valid email required' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    // Ensure user exists. listUsers paginates — for dev fan-out we scan first
    // 200, then create on miss. Real prod auth doesn't use this path.
    let userId: string | undefined
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (listErr) {
      return NextResponse.json({ error: `listUsers: ${listErr.message}` }, { status: 500 })
    }
    const found = existing.users.find((u) => (u.email ?? '').toLowerCase() === email)
    if (found) {
      userId = found.id
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (createErr || !created.user) {
        return NextResponse.json({ error: `createUser: ${createErr?.message ?? 'unknown'}` }, { status: 500 })
      }
      userId = created.user.id
    }

    // Generate a magic-link hashed token; we never email it, we verify directly.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkErr || !link?.properties?.hashed_token) {
      return NextResponse.json({ error: `generateLink: ${linkErr?.message ?? 'no token'}` }, { status: 500 })
    }

    // Cookie-aware SSR client so verifyOtp writes session cookies on the response.
    const cookieStore = await cookies()
    const ssr = createSsrClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch { /* server-component-only context */ }
          },
        },
      },
    )
    const { error: verifyErr } = await ssr.auth.verifyOtp({
      type: 'magiclink',
      token_hash: link.properties.hashed_token,
    })
    if (verifyErr) {
      return NextResponse.json({ error: `verifyOtp: ${verifyErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true, user_id: userId, email })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { TopNav } from '@/lib/site/TopNav'
import CredentialsForm from './CredentialsForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'X credentials — ViralX',
}

export default async function CredentialsPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?next=/viralx/credentials')

  const { data: existing } = await sb
    .from('viralx_x_credentials')
    .select('x_screen_name')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <>
      <TopNav variant="page" />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px 96px' }}>
        <p
          style={{
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)',
            textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px',
          }}
        >
          Viralx · X credentials
        </p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Bring your own X token.
        </h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
          Until our X OAuth app is approved, you post via your own developer credentials. Create an
          app at{' '}
          <a href="https://developer.x.com" target="_blank" rel="noopener noreferrer"
             style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
            developer.x.com
          </a>
          {' '}with read+write permission, generate user-context OAuth 1.0a keys, and paste all four below.
          We verify them against{' '}
          <code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>GET /2/users/me</code>{' '}
          before saving and only post when you click <strong>Post to X</strong> on a day card.
        </p>

        <CredentialsForm
          initialScreenName={existing?.x_screen_name ?? null}
          hasExisting={!!existing}
        />

        <p style={{ marginTop: 32, fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink-dim)' }}>Heads up:</strong> we store these keys
          server-side in plaintext during the private beta. We will move to encrypted-at-rest before
          general release. You can remove them at any time.
        </p>

        <p style={{ marginTop: 24, fontSize: 13 }}>
          <Link href="/viralx" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
            ← back to ViralX
          </Link>
        </p>
      </main>
    </>
  )
}

import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { TopNav } from '@/lib/site/TopNav'
import StartForm from '../StartForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Start your 14-day plan — ViralX',
  description:
    'A day-by-day post & meme calendar pulled from how 277 AI startups went 0 → launch on X. Built for founders with zero go-to-market experience.',
  alternates: { canonical: 'https://growthhunt.ai/viralx/start' },
}

export default async function ViralxStartPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()

  // Middleware already gates anonymous; here we distinguish soft-auth (no Supabase user) from real
  if (!user) {
    return (
      <>
        <TopNav variant="page" />
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px' }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1.1, margin: '0 0 16px' }}>
            One more step.
          </h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 16, lineHeight: 1.6, margin: '0 0 24px' }}>
            ViralX writes drafts to your account and posts them on your behalf, so we need
            a real sign-in — not just an email. Use Google for the fastest path.
          </p>
          <Link
            href="/login?next=/viralx/start"
            style={{
              display: 'inline-block', padding: '14px 28px',
              background: 'var(--accent)', color: 'var(--accent-ink)',
              borderRadius: 999, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Sign in with Google →
          </Link>
        </main>
      </>
    )
  }

  // If they already have an active session, jump straight to it
  const { data: existing } = await sb
    .from('viralx_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    redirect(`/viralx/sessions/${existing.id}`)
  }

  return (
    <>
      <TopNav variant="page" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px' }}>
        <p
          style={{
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)',
            textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px',
          }}
        >
          Viralx · 14-day launch playbook
        </p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1.05, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          You don&apos;t need a marketing team.
        </h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
          Tell us your X handle and what you&apos;re building. We&apos;ll lay out a day-by-day post
          and meme calendar — drawn from how 277 AI startups actually went 0 → launch on X.
        </p>
        <StartForm />
        <p style={{ marginTop: 32, fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
          You can edit, swap, regenerate, or skip any day. Nothing gets posted automatically.
        </p>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          <Link href="/viralx" style={{ color: 'var(--ink-dim)', textDecoration: 'underline' }}>
            ← browse the template lab
          </Link>
        </p>
      </main>
    </>
  )
}

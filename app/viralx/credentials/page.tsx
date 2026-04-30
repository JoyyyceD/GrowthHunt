import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { TopNav } from '@/lib/site/TopNav'
import CredentialsForm from './CredentialsForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connect your X account — ViralX',
  description: 'Bring your own X API keys. Your keys, your wallet, our infrastructure.',
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
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 96px' }}>
        <p
          style={{
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)',
            textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px',
          }}
        >
          Viralx · Connect X
        </p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Your keys, your wallet, our infrastructure.
        </h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px' }}>
          ViralX runs on <strong>Bring-Your-Own-Token</strong>. You create a small X developer
          app, top it up with whatever credit you want ($5 lasts months), and paste 4 keys here.
          We sign and send tweets on your behalf — but X bills <em>you</em> directly per post,
          not us. That keeps ViralX cheap to use and impossible for us to get between you and
          your X account.
        </p>
        <p style={{ color: 'var(--ink-dim)', fontSize: 13, lineHeight: 1.6, margin: '0 0 32px' }}>
          Setup takes ~5 minutes if it&apos;s your first time. Walkthrough below.
        </p>

        {/* ─── 5-min walkthrough ──────────────────────────────────────────── */}
        <details
          open={!existing}
          style={{
            background: 'var(--bg-elev)',
            border: '1px solid var(--rule)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 28,
          }}
        >
          <summary
            style={{
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              How to get the 4 keys ↓
            </span>
          </summary>

          <ol style={{ marginTop: 16, paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)' }}>
            <li style={{ marginBottom: 14 }}>
              Open{' '}
              <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                developer.x.com → Dashboard
              </a>
              {' '}— sign up for the free developer account if you haven&apos;t already
              (it&apos;s a one-form questionnaire, instant approval most of the time).
            </li>

            <li style={{ marginBottom: 14 }}>
              In the dashboard, find your <strong>Default project</strong> &rarr; click into the
              app under it &rarr; <strong>User authentication settings</strong>{' '}
              &rarr; <strong>Set up</strong>.
            </li>

            <li style={{ marginBottom: 14 }}>
              Configure:
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                <li><strong>App permissions:</strong> select <code style={codeStyle}>Read and write</code> (without write you can&apos;t post).</li>
                <li><strong>Type of App:</strong> select <code style={codeStyle}>Web App, Automated App or Bot</code>.</li>
                <li>
                  <strong>Callback URI / Redirect URL:</strong> paste{' '}
                  <code style={codeStyle}>https://growthhunt.ai/viralx/credentials</code>
                  {' '}(any HTTPS URL works — we don&apos;t use OAuth flow, but X requires this field).
                </li>
                <li><strong>Website URL:</strong> paste your startup&apos;s URL (or <code style={codeStyle}>https://growthhunt.ai</code> if you don&apos;t have one yet).</li>
              </ul>
            </li>

            <li style={{ marginBottom: 14 }}>
              Go to <strong>Keys and tokens</strong> tab. Generate / regenerate the four:
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                <li><strong>API Key</strong> &amp; <strong>API Key Secret</strong> (= consumer key + secret)</li>
                <li><strong>Access Token</strong> &amp; <strong>Access Token Secret</strong></li>
              </ul>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
                X only shows secrets <em>once</em> — copy them somewhere safe immediately, or you&apos;ll have to regenerate.
              </span>
            </li>

            <li style={{ marginBottom: 14 }}>
              Top up your X API credits (under <strong>Billing</strong> or{' '}
              <a href="https://developer.x.com/en/portal/products" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                Products
              </a>
              ). Minimum is usually $5. At <strong>$0.015 per text post / $0.20 per
              link-bearing post</strong>, $5 covers 25-300 tweets depending on link mix.
            </li>

            <li>
              Paste all four keys in the form below &rarr; click{' '}
              <strong>Save &amp; verify</strong>. We hit X&apos;s{' '}
              <code style={codeStyle}>GET /2/users/me</code> with your keys to confirm
              they&apos;re valid before saving — invalid keys never get stored.
            </li>
          </ol>
        </details>

        <CredentialsForm
          initialScreenName={existing?.x_screen_name ?? null}
          hasExisting={!!existing}
        />

        <p style={{ marginTop: 32, fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--ink-dim)' }}>How we store your keys:</strong>{' '}
          server-side in our Postgres, RLS-scoped to your user only — no other ViralX user can
          read them, and our public API never returns them. They&apos;re used solely to sign
          tweet-post requests on your behalf. We never read your DMs, never post on your
          account without your action, and you can remove them at any time. Plaintext-at-rest
          during private beta; on the v2 roadmap is encrypted-at-rest via{' '}
          <code style={codeStyle}>pgsodium</code>.
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

const codeStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 12,
  background: 'var(--bg-card)',
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid var(--rule)',
}

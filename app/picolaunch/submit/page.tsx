import type { Metadata } from 'next'
import Link from 'next/link'
import { getGoogleUser } from '@/lib/picolaunch/auth-gate'
import SubmitForm from './SubmitForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Submit your AI startup — PicoLaunch',
  description: 'Add your AI startup to PicoLaunch. Auto-published. No review queue.',
  robots: { index: false, follow: true },
}

export default async function SubmitPage() {
  const user = await getGoogleUser('/picolaunch/submit')

  return (
    <div>
      <section className="opc-section" style={{ padding: '64px 0 32px' }}>
        <div className="shell" style={{ maxWidth: 720 }}>
          <Link
            href="/picolaunch"
            style={{
              display: 'inline-block',
              marginBottom: 24,
              fontSize: 13,
              color: 'var(--ink-faint)',
              textDecoration: 'none',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            ← All launches
          </Link>

          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              fontWeight: 400,
              margin: '0 0 14px',
            }}
          >
            Submit your <em style={{ color: 'var(--accent)' }}>AI startup</em>.
          </h1>
          <p className="opc-sub" style={{ marginBottom: 32 }}>
            Auto-published. No review queue. Edit anytime. Free for everyone.
          </p>

          {user ? (
            <SubmitForm
              defaultBy={user.name}
            />
          ) : (
            <UpgradePrompt />
          )}
        </div>
      </section>
    </div>
  )
}

function UpgradePrompt() {
  return (
    <div
      style={{
        background: '#fff5e0',
        border: '1px solid rgba(232, 78, 27, 0.25)',
        borderRadius: 12,
        padding: '24px 28px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--accent)',
          marginBottom: 8,
        }}
      >
        One more step
      </div>
      <h3
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 22,
          fontWeight: 400,
          margin: '0 0 8px',
        }}
      >
        Submitting requires Google sign-in.
      </h3>
      <p style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.55, margin: '0 0 16px' }}>
        We use Google to verify ownership so you can edit and delete your launch later. Your email
        sign-in stays — you just need to add Google.
      </p>
      <Link
        href="/login?next=/picolaunch/submit"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--ink)',
          color: 'var(--bg)',
          padding: '12px 22px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        Continue with Google →
      </Link>
    </div>
  )
}

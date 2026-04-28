'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { TopNav } from '@/lib/site/TopNav'
import { setSoftUser } from '@/lib/soft-auth'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') || '/'
  const [loading, setLoading] = useState<'google' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading('google')
    setError('')
    try {
      // Stash invite code so we can post it once the OAuth round-trip completes
      const code = inviteCode.trim().toUpperCase()
      if (code && typeof window !== 'undefined') {
        localStorage.setItem('gh-pending-invite-code', code)
      }
      const supabase = createBrowserClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google.')
      setLoading(null)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading('email')
    setError('')
    try {
      // Save email for marketing / future communication
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: 'login-email',
          inviteCode: inviteCode.trim().toUpperCase() || undefined,
        }),
      }).catch(() => { /* non-blocking */ })

      // Soft auth: localStorage for display + cookie for middleware gate
      setSoftUser(email)
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not continue. Try again?')
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <TopNav variant="page" />

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'var(--bg-elev)',
          border: '1px solid var(--rule)',
          borderRadius: 20,
          padding: '48px 40px',
          boxShadow: '0 24px 60px rgba(20,17,13,0.08)',
        }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48,
              border: '2px solid var(--ink)',
              borderRadius: '50%',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)' }} />
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--serif)',
            fontSize: 36,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
            textAlign: 'center',
            lineHeight: 1.05,
          }}>
            Welcome.
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: 15, margin: '0 0 28px' }}>
            Sign in with Google or just leave your email.
          </p>

          {/* Shared invitation code field — works with either Google or email below */}
          <div style={{ marginBottom: 28 }}>
            <label
              htmlFor="invite-code"
              style={{
                display: 'block',
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: 'var(--ink-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
              Invitation code (optional)
            </label>
            <input
              id="invite-code"
              type="text"
              placeholder="GH-XXXXXX"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              disabled={loading !== null}
              autoComplete="off"
              maxLength={32}
              style={{
                width: '100%',
                height: 48,
                padding: '0 18px',
                background: 'var(--bg-card)',
                border: '1px solid var(--rule)',
                borderRadius: 999,
                fontSize: 14,
                color: 'var(--ink)',
                fontFamily: 'var(--mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                outline: 'none',
                opacity: loading ? 0.5 : 1,
              }}
            />
            <p style={{ marginTop: 8, color: 'var(--ink-faint)', fontSize: 11, lineHeight: 1.5, paddingLeft: 4 }}>
              Have a code? It applies to whichever sign-in method you pick below.
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading !== null}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              height: 52,
              background: 'var(--bg-elev)',
              border: '1px solid var(--rule-strong)',
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--ink)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading && loading !== 'google' ? 0.5 : 1,
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <GoogleIcon />
            {loading === 'google' ? 'Redirecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin}>
            <input
              type="email"
              required
              placeholder="founder@yourstartup.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading !== null}
              style={{
                width: '100%',
                height: 52,
                padding: '0 18px',
                background: 'var(--bg-card)',
                border: '1px solid var(--rule-strong)',
                borderRadius: 999,
                fontSize: 15,
                color: 'var(--ink)',
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: 10,
                opacity: loading && loading !== 'email' ? 0.5 : 1,
              }}
            />
            <button
              type="submit"
              disabled={loading !== null || !email.trim()}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                height: 52,
                background: email.trim() ? 'var(--accent)' : 'var(--bg-card)',
                color: email.trim() ? 'var(--accent-ink)' : 'var(--ink-faint)',
                border: 'none',
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== 'email' ? 0.5 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {loading === 'email' ? 'Letting you in…' : 'Continue with email →'}
            </button>
          </form>
          <p style={{ marginTop: 10, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, lineHeight: 1.5 }}>
            No password needed. We&apos;ll email you when new modules ship.
          </p>

          {error && (
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 10,
              color: '#dc2626',
              fontSize: 13,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Private beta · Open access
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="eyebrow"><span className="dot" />Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

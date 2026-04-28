'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { TopNav } from '@/lib/site/TopNav'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') || '/'
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading('google')
    setError('')
    try {
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

  const handleGuestLogin = async () => {
    setLoading('guest')
    setError('')
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        // Most common case: anonymous provider not enabled in Supabase dashboard
        if (error.message?.toLowerCase().includes('anonymous')) {
          throw new Error('Guest sign-in is not enabled yet. Please use Google to continue.')
        }
        throw error
      }
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to continue as guest.')
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
          <p style={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: 15, margin: '0 0 36px' }}>
            Sign in to GrowthHunt — or skip and try it as a guest.
          </p>

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

          {/* Guest button */}
          <button
            onClick={handleGuestLogin}
            disabled={loading !== null}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 52,
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--accent-ink)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading && loading !== 'guest' ? 0.5 : 1,
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {loading === 'guest' ? 'Setting up…' : 'Continue as guest →'}
          </button>
          <p style={{ marginTop: 10, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, lineHeight: 1.5 }}>
            No email, no password. Your work is saved temporarily — link a Google account anytime to keep it.
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

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/browser'
import { TopNav } from '@/lib/site/TopNav'

// NOTE: This is a `'use client'` page so we cannot export `metadata`.
// `<title>` / meta tags are set via `document` below — the indie-style site
// uses inline styles + client components throughout xgrower, and we'd rather
// keep the redeem flow co-located than split into a server wrapper just for
// metadata. SEO impact is nil (redeem page should be noindex anyway).

type AuthState = 'checking' | 'signed-out' | 'signed-in'

type Result =
  | { kind: 'success'; message: string; expiresAt: string }
  | { kind: 'already-pro' }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string }

function formatExpiry(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function RedeemPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>('checking')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  // Set document title client-side (this is a client component).
  useEffect(() => {
    document.title = 'Redeem your founding code · Xgrower'
    const meta = document.querySelector('meta[name="description"]')
    const desc = 'Redeem your Xgrower founding code for 30 days of Pro access.'
    if (meta) {
      meta.setAttribute('content', desc)
    } else {
      const m = document.createElement('meta')
      m.name = 'description'
      m.content = desc
      document.head.appendChild(m)
    }
  }, [])

  // Check supabase session on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createBrowserClient()
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        setAuth(data.session ? 'signed-in' : 'signed-out')
      } catch {
        if (!cancelled) setAuth('signed-out')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!normalized || submitting) return

    setSubmitting(true)
    setResult(null)

    try {
      const supabase = createBrowserClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setAuth('signed-out')
        setSubmitting(false)
        return
      }

      const res = await fetch('/api/xgrower/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: normalized }),
      })

      if (res.status === 401) {
        // Session lost on the server (cookie expired, etc). Bounce to login.
        router.push('/login?next=/xgrower/redeem')
        return
      }

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        expiresAt?: string
        error?: string
      }

      if (res.ok && json.ok && json.expiresAt) {
        setResult({
          kind: 'success',
          message: json.message ?? 'Pro activated for 30 days!',
          expiresAt: json.expiresAt,
        })
      } else if (res.status === 409) {
        setResult({ kind: 'already-pro' })
      } else if (res.status === 400) {
        setResult({ kind: 'invalid' })
      } else {
        setResult({
          kind: 'error',
          message: json.error ?? 'Something went wrong. Please try again.',
        })
      }
    } catch {
      setResult({
        kind: 'error',
        message: 'Something went wrong. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <TopNav variant="page" />
      <main style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
        <section
          style={{
            padding: '80px 24px 100px',
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              padding: '4px 10px',
              border: '1px solid var(--rule)',
              borderRadius: 999,
              display: 'inline-block',
              marginBottom: 28,
            }}
          >
            founding code · redeem
          </div>

          {/* AUTH: checking */}
          {auth === 'checking' && <CheckingState />}

          {/* AUTH: signed out */}
          {auth === 'signed-out' && <SignedOutPrompt />}

          {/* AUTH: signed in */}
          {auth === 'signed-in' && (
            <>
              {/* SUCCESS */}
              {result?.kind === 'success' ? (
                <SuccessState message={result.message} expiresAt={result.expiresAt} />
              ) : result?.kind === 'already-pro' ? (
                <AlreadyProState onReset={() => setResult(null)} />
              ) : (
                <RedeemForm
                  code={code}
                  setCode={setCode}
                  submitting={submitting}
                  onSubmit={onSubmit}
                  errorMessage={
                    result?.kind === 'invalid'
                      ? 'Invalid or expired invite code.'
                      : result?.kind === 'error'
                      ? result.message
                      : null
                  }
                />
              )}
            </>
          )}
        </section>
      </main>
    </>
  )
}

function CheckingState() {
  return (
    <p
      style={{
        fontSize: 15,
        color: 'var(--ink-faint)',
        fontFamily: 'var(--mono)',
      }}
    >
      Checking your session…
    </p>
  )
}

function SignedOutPrompt() {
  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(40px, 6vw, 64px)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: '0 0 20px',
          fontWeight: 400,
        }}
      >
        Sign in to redeem your invite code.
      </h1>
      <p
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          lineHeight: 1.5,
          color: 'var(--ink-dim)',
          margin: '0 0 36px',
        }}
      >
        Founding codes unlock 30 days of Pro (unlimited replies). You need to be
        signed in so we can attach the grant to your account.
      </p>
      <Link
        href="/login?next=/xgrower/redeem"
        style={{
          fontSize: 16,
          fontWeight: 600,
          padding: '14px 28px',
          borderRadius: 999,
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Sign in to continue →
      </Link>
    </>
  )
}

function RedeemForm({
  code,
  setCode,
  submitting,
  onSubmit,
  errorMessage,
}: {
  code: string
  setCode: (v: string) => void
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  errorMessage: string | null
}) {
  const canSubmit = code.trim().length > 0 && !submitting
  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(40px, 6vw, 64px)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: '0 0 20px',
          fontWeight: 400,
        }}
      >
        Got a founding code? <em style={{ color: 'var(--accent)' }}>Drop it in.</em>
      </h1>
      <p
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          lineHeight: 1.5,
          color: 'var(--ink-dim)',
          margin: '0 0 36px',
        }}
      >
        Founding codes unlock 30 days of Pro (unlimited replies). Each code is
        single-use and expires Jun 16, 2026.
      </p>

      <form onSubmit={onSubmit} style={{ marginBottom: 24 }}>
        <label
          htmlFor="founding-code"
          style={{
            display: 'block',
            fontSize: 11,
            fontFamily: 'var(--mono)',
            color: 'var(--ink-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            marginBottom: 10,
            paddingLeft: 4,
          }}
        >
          Your code
        </label>
        <input
          id="founding-code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          placeholder="XGFM-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={submitting}
          style={{
            width: '100%',
            height: 56,
            padding: '0 20px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--rule-strong)',
            borderRadius: 999,
            fontSize: 16,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            outline: 'none',
            marginBottom: 16,
            opacity: submitting ? 0.6 : 1,
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 600,
            padding: '14px 28px',
            borderRadius: 999,
            background: canSubmit ? 'var(--accent)' : 'var(--bg-card)',
            color: canSubmit ? 'var(--accent-ink)' : 'var(--ink-faint)',
            border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {submitting ? 'Activating…' : 'Redeem →'}
        </button>
      </form>

      {errorMessage && (
        <div
          role="alert"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            borderRadius: 12,
            color: 'var(--accent)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {errorMessage}
        </div>
      )}

      <p
        style={{
          marginTop: 40,
          fontSize: 13,
          color: 'var(--ink-faint)',
          lineHeight: 1.6,
        }}
      >
        Codes are case-insensitive. Dashes are fine. If your code says it's
        invalid and you're sure you typed it right, ping{' '}
        <a
          href="https://x.com/Felixisbuilding"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--ink-dim)' }}
        >
          @Felixisbuilding
        </a>
        .
      </p>
    </>
  )
}

function SuccessState({ message, expiresAt }: { message: string; expiresAt: string }) {
  return (
    <>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--accent)',
          letterSpacing: '0.12em',
          marginBottom: 16,
        }}
      >
        PRO / ACTIVE
      </div>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(44px, 7vw, 72px)',
          lineHeight: 1.02,
          letterSpacing: '-0.02em',
          margin: '0 0 20px',
          fontWeight: 400,
        }}
      >
        {message}
      </h1>
      <p
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          lineHeight: 1.5,
          color: 'var(--ink-dim)',
          margin: '0 0 32px',
        }}
      >
        Your Pro access runs through{' '}
        <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{formatExpiry(expiresAt)}</b>.
        Unlimited replies, no per-reply cost.
      </p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28 }}>
        <Link
          href="/xgrower/install"
          style={{
            fontSize: 16,
            fontWeight: 600,
            padding: '14px 28px',
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Get the extension →
        </Link>
        <Link
          href="/xgrower"
          style={{
            fontSize: 14,
            color: 'var(--ink-dim)',
            textDecoration: 'none',
            padding: '14px 8px',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          ← back to xgrower
        </Link>
      </div>

      <p
        style={{
          marginTop: 16,
          fontSize: 13,
          color: 'var(--ink-faint)',
          lineHeight: 1.6,
        }}
      >
        Already installed? Open the Xgrower extension popup — Pro should kick in
        on the next reply burst.
      </p>
    </>
  )
}

function AlreadyProState({ onReset }: { onReset: () => void }) {
  return (
    <>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--accent)',
          letterSpacing: '0.12em',
          marginBottom: 16,
        }}
      >
        PRO / ALREADY ACTIVE
      </div>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(40px, 6vw, 64px)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: '0 0 20px',
          fontWeight: 400,
        }}
      >
        You already have an active Pro subscription.
      </h1>
      <p
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          lineHeight: 1.5,
          color: 'var(--ink-dim)',
          margin: '0 0 36px',
        }}
      >
        Your existing access continues — no need to redeem another code right
        now. Hold on to it; you can redeem after your current grant expires.
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link
          href="/xgrower"
          style={{
            fontSize: 16,
            fontWeight: 600,
            padding: '14px 28px',
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Back to Xgrower →
        </Link>
        <button
          type="button"
          onClick={onReset}
          style={{
            fontSize: 14,
            color: 'var(--ink-dim)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '14px 8px',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          ← try a different code
        </button>
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { readSoftUserEmail } from '@/lib/soft-auth'

/**
 * Client-side content gate.
 *
 * Always renders children into the DOM (so search engines and AI crawlers
 * index the full content). For unauthenticated viewers it caps the visible
 * height with a fade-out mask and overlays a "sign in to continue" card.
 *
 * Pair this with structured data on the page:
 *   isAccessibleForFree: false
 *   hasPart: { isAccessibleForFree: false, cssSelector: '.gh-paywall' }
 *
 * The Google "Flexible Sampling" guidelines treat this combination as a
 * compliant subscription gate (not cloaking).
 *
 * https://developers.google.com/search/docs/specialty/ecommerce/paywalled-content
 */
export function GatedContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // null = still loading; true = authed; false = needs gate
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    // Soft auth (cookie-backed) is the cheapest check
    if (readSoftUserEmail()) {
      setAuthed(true)
      return
    }
    // Then ask Supabase
    let supabase
    try {
      supabase = createBrowserClient()
    } catch {
      // env missing — fall back to "not authed" so the gate shows
      setAuthed(false)
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user || !!readSoftUserEmail())
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user || !!readSoftUserEmail())
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Loading or authed: render fully — bots also hit this branch since they
  // never run the useEffect (no JS execution → state stays null, which we
  // treat the same as "render fully").
  if (authed !== false) {
    return <div className="gh-paywall">{children}</div>
  }

  // Unauthed: keep the content in the DOM but visually cap and fade it
  return (
    <div className="gh-paywall" style={{ position: 'relative' }}>
      <div
        aria-hidden="true"
        style={{
          maxHeight: 520,
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 95%)',
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>

      {/* Sign-in card — sits just below the fade */}
      <div
        style={{
          maxWidth: 560,
          margin: '-40px auto 0',
          padding: '48px 40px',
          background: 'var(--bg)',
          border: '1px solid var(--rule-strong)',
          borderRadius: 20,
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(20,17,13,0.08)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          className="eyebrow"
          style={{ marginBottom: 16, justifyContent: 'center', display: 'inline-flex' }}
        >
          <span className="dot" />
          Founder reading
        </div>
        <h3
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(28px, 3.4vw, 40px)',
            fontWeight: 400,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            margin: '0 0 14px',
          }}
        >
          Keep reading the <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>full breakdown</em>.
        </h3>
        <p
          style={{
            fontSize: 15,
            color: 'var(--ink-dim)',
            lineHeight: 1.6,
            margin: '0 0 24px',
            maxWidth: 420,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          The synthesis and every deep dive below are for signed-in readers. No password needed — just leave your email.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname || '/')}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Continue reading →
        </Link>
        <p
          style={{
            marginTop: 16,
            color: 'var(--ink-faint)',
            fontSize: 11.5,
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          No spam · One-click sign-in · Free
        </p>
      </div>
    </div>
  )
}

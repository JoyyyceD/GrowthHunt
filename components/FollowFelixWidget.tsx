'use client'

import { useEffect, useState } from 'react'

// Floating "follow the builder" widget, indie-style.
// Small tagline + red pill CTA linking to the builder's 小红书 (RED) profile.
// Dismiss state and follow-click state are persisted in localStorage so the
// card doesn't re-appear after a user has either committed or shooed it away.

const DISMISSED_KEY = 'gh.followFelix.dismissed'
const FOLLOWED_KEY = 'gh.followFelix.followed'
const FOLLOW_URL = 'https://xhslink.com/m/31NMBbcsihv'

// 小红书 (RED) brand red — sits cleanly next to the page's amber/black accent
// palette without competing for the primary CTA spot.
const XHS_RED = '#FF2442'

export default function FollowFelixWidget() {
  // Render-gated by a `mounted` flag so SSR output is empty and we don't get a
  // hydration mismatch from reading localStorage on the server.
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY) === '1'
      const followed = localStorage.getItem(FOLLOWED_KEY) === '1'
      if (dismissed || followed) {
        setVisible(false)
      }
    } catch {
      // localStorage blocked (private mode etc.) — leave visible.
    }

    const mq = window.matchMedia('(max-width: 480px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    if (mq.addEventListener) {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
    // Older Safari fallback
    mq.addListener(apply)
    return () => mq.removeListener(apply)
  }, [])

  if (!mounted || !visible) return null

  const onFollow = () => {
    try {
      localStorage.setItem(FOLLOWED_KEY, '1')
    } catch {
      // ignore
    }
    window.open(FOLLOW_URL, '_blank', 'noopener')
  }

  const onDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        padding: '12px 14px 14px',
        background: 'var(--bg-card, #FFFFFF)',
        borderTop: '1px solid var(--rule, rgba(0,0,0,0.08))',
        boxShadow: '0 -6px 24px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }
    : {
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 60,
        width: 280,
        padding: '14px 16px 14px',
        background: 'var(--bg-card, #FFFFFF)',
        border: '1px solid var(--rule, rgba(0,0,0,0.08))',
        borderRadius: 14,
        boxShadow: '0 8px 28px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }

  return (
    <div role="complementary" aria-label="Follow the builder" style={containerStyle}>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-faint, #888)',
          fontSize: 14,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M2 2 L10 10 M10 2 L2 10" />
        </svg>
      </button>

      {isMobile ? (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'var(--mono, ui-monospace, SFMono-Regular, monospace)',
                color: 'var(--ink-faint, #6b6b6b)',
                letterSpacing: '0.04em',
                marginBottom: 2,
              }}
            >
              Watching the quit-bet?
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--ink, #111)',
                lineHeight: 1.3,
              }}
            >
              Follow along while it&apos;s still 1 guy.
            </div>
          </div>
          <button
            type="button"
            onClick={onFollow}
            style={{
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              padding: '10px 14px',
              borderRadius: 999,
              background: XHS_RED,
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Follow 大吉是Builder
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 12,
              fontFamily: 'var(--mono, ui-monospace, SFMono-Regular, monospace)',
              color: 'var(--ink-faint, #6b6b6b)',
              letterSpacing: '0.04em',
              paddingRight: 18,
            }}
          >
            Watching the quit-bet?
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--ink, #111)',
              lineHeight: 1.35,
              marginTop: -2,
              marginBottom: 2,
            }}
          >
            Follow along while it&apos;s still 1 guy shipping in public.
          </div>
          <button
            type="button"
            onClick={onFollow}
            style={{
              alignSelf: 'flex-start',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 999,
              background: XHS_RED,
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Follow 大吉是Builder
          </button>
        </>
      )}
    </div>
  )
}

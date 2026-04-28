'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/browser'
import { readSoftUserEmail } from '@/lib/soft-auth'

export default function LaunchToolButton({
  featureId, featureName, launchUrl,
}: {
  featureId: string
  featureName: string
  launchUrl?: string
}) {
  const [authState, setAuthState] = useState<'loading' | 'in' | 'out'>('loading')

  useEffect(() => {
    const hasSoft = () => !!readSoftUserEmail()

    let supabase
    try {
      supabase = createBrowserClient()
    } catch {
      setAuthState(hasSoft() ? 'in' : 'out')
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      setAuthState(data.user || hasSoft() ? 'in' : 'out')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session?.user || hasSoft() ? 'in' : 'out')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px',
    borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none',
    border: 'none', cursor: 'pointer',
  }

  if (authState === 'loading') {
    return (
      <button disabled style={{ ...baseStyle, background: 'var(--bg-card)', color: 'var(--ink-faint)' }}>
        Loading…
      </button>
    )
  }

  if (authState === 'out') {
    return (
      <Link
        href={`/login?next=/${featureId}`}
        style={{ ...baseStyle, background: 'var(--accent)', color: 'var(--accent-ink)' }}
      >
        Log in to launch {featureName} →
      </Link>
    )
  }

  // Logged in
  if (launchUrl) {
    return (
      <a
        href={launchUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...baseStyle, background: 'var(--accent)', color: 'var(--accent-ink)' }}
      >
        Launch {featureName} →
      </a>
    )
  }

  return (
    <button
      disabled
      style={{ ...baseStyle, background: 'var(--bg-card)', color: 'var(--ink-faint)', border: '1px solid var(--rule)' }}
    >
      Coming to your dashboard soon
    </button>
  )
}

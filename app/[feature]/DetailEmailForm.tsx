'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { readSoftUserEmail } from '@/lib/soft-auth'

export default function DetailEmailForm({
  featureId,
  featureName,
  isLive,
}: {
  featureId: string
  featureName: string
  isLive: boolean
}) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  // If the visitor is already signed in (soft email or Supabase), auto-record
  // their interest in this specific feature and skip the email form entirely.
  const [authedEmail, setAuthedEmail] = useState<string | null>(null)

  useEffect(() => {
    // Soft auth (cookie-backed) is the cheapest check
    const soft = readSoftUserEmail()
    if (soft) {
      setAuthedEmail(soft)
      autoSubscribe(soft)
      return
    }
    // Then ask Supabase
    let supabase
    try {
      supabase = createBrowserClient()
    } catch {
      return // env missing — leave the form for unauth path
    }
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email
      if (e) {
        setAuthedEmail(e)
        autoSubscribe(e)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const autoSubscribe = (e: string) => {
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e.toLowerCase(), source: `feature-${featureId}` }),
    }).catch(() => { /* silent */ })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: `feature-${featureId}` }),
      })
    } catch { /* silent */ }
    setSubmitted(true)
    setLoading(false)
  }

  // Authed visitor — already on the list. Show a confirmation, no form.
  if (authedEmail) {
    return (
      <div className="eyebrow" style={{ color: 'var(--accent)' }}>
        <span className="dot" />
        {isLive
          ? `Already signed in as ${authedEmail} — link sent.`
          : `You're on the list. We'll email ${authedEmail} when ${featureName} ships.`}
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="eyebrow" style={{ color: 'var(--accent)' }}>
        <span className="dot" />
        {isLive ? 'Link sent — check your inbox.' : "You're on the list — see you soon."}
      </div>
    )
  }

  return (
    <form className="hero-form" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="founder@yourstartup.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? '...' : isLive ? 'Get the link' : `Notify me about ${featureName}`}
      </button>
    </form>
  )
}

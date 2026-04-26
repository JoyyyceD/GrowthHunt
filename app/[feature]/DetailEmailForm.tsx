'use client'

import { useState } from 'react'

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

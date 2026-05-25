'use client'

/**
 * Home page hero chat — genspark-style first-screen input. Lives at the top of
 * the marketing page. Type a question/task, hit enter, and we push to
 * /gtm?q=<encoded>. /gtm handles the auth + workspace prerequisites and the
 * ChatPanel auto-fires the message on mount.
 */
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const HOME_SUGGESTIONS = [
  'Audit growthhunt.ai for AI citations',
  'Find 6 indie creators to DM',
  'Run the onboarding playbook',
  'What\'s working in AI marketing this week?',
]

export function HomeChatHero() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  function go(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const url = `/gtm?q=${encodeURIComponent(trimmed)}`
    router.push(url)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    go(input)
  }

  return (
    <div style={{ marginTop: 28, maxWidth: 640 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          background: 'var(--bg-elev)',
          border: '1.5px solid var(--rule-strong)',
          borderRadius: 16,
          padding: 6,
          boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 16px 40px -24px rgba(0,0,0,0.18)',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the GTM agent anything — audit my page, find 6 creators, draft a launch post…"
          autoComplete="off"
          disabled={busy}
          aria-label="Ask the GTM agent"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '14px 18px',
            fontSize: 15,
            color: 'var(--ink)',
            fontFamily: 'var(--sans)',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          style={{
            background: !input.trim() || busy ? 'var(--ink-faint)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '0 22px',
            fontSize: 14,
            fontWeight: 600,
            cursor: !input.trim() || busy ? 'not-allowed' : 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          {busy ? 'Loading…' : 'Send'}
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {HOME_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            disabled={busy}
            style={{
              background: 'transparent',
              border: '1px solid var(--rule)',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12.5,
              color: 'var(--ink-dim)',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--sans)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
        We&apos;ll check you&apos;re logged in and have a workspace before running. New here?{' '}
        <a href="/login?next=/gtm" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Sign up</a>{' '}
        — free.
      </p>
    </div>
  )
}

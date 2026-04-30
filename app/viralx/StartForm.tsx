'use client'

import { useState, useTransition } from 'react'
import { createViralxSession } from './actions'

export default function StartForm() {
  const [handle, setHandle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createViralxSession(fd)
      // On success, the action redirects — code below only runs on validation failure
      if (res && !res.ok) setError(res.error || 'Something went wrong.')
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 52,
    padding: '0 18px',
    background: 'var(--bg-card)',
    border: '1px solid var(--rule-strong)',
    borderRadius: 14,
    fontSize: 15,
    color: 'var(--ink)',
    fontFamily: 'inherit',
    outline: 'none',
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label
          htmlFor="vx-handle"
          style={{
            display: 'block', fontSize: 11, fontFamily: 'var(--mono)',
            color: 'var(--ink-faint)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 4,
          }}
        >
          Your X handle
        </label>
        <input
          id="vx-handle" name="handle" type="text" required
          autoComplete="off" autoCapitalize="none" spellCheck={false}
          maxLength={16}
          placeholder="@yourstartup"
          value={handle}
          onChange={e => setHandle(e.target.value)}
          disabled={pending}
          style={inputStyle}
        />
      </div>

      <div>
        <label
          htmlFor="vx-blurb"
          style={{
            display: 'block', fontSize: 11, fontFamily: 'var(--mono)',
            color: 'var(--ink-faint)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 4,
          }}
        >
          One-line startup pitch
        </label>
        <textarea
          id="vx-blurb" name="blurb" required
          maxLength={280} rows={3}
          placeholder="e.g. AI agent that drafts compliance reports for healthcare startups"
          value={blurb}
          onChange={e => setBlurb(e.target.value)}
          disabled={pending}
          style={{ ...inputStyle, height: 'auto', padding: '14px 18px', resize: 'vertical' }}
        />
        <p style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-faint)', textAlign: 'right' }}>
          {blurb.length}/280
        </p>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: '#fef2f2',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 10,
          color: '#dc2626',
          fontSize: 13,
        }}>{error}</div>
      )}

      <button
        type="submit"
        disabled={pending || !handle || !blurb}
        style={{
          height: 52,
          background: handle && blurb ? 'var(--accent)' : 'var(--bg-card)',
          color: handle && blurb ? 'var(--accent-ink)' : 'var(--ink-faint)',
          border: 'none',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 600,
          cursor: pending || !handle || !blurb ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
      >
        {pending ? 'Building your 14-day plan…' : 'Generate my 14-day plan →'}
      </button>
    </form>
  )
}

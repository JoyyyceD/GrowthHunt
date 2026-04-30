'use client'

import { useState } from 'react'

interface Props {
  initialScreenName: string | null
  hasExisting: boolean
}

export default function CredentialsForm({ initialScreenName, hasExisting }: Props) {
  const [ck, setCk] = useState('')
  const [cs, setCs] = useState('')
  const [at, setAt] = useState('')
  const [ats, setAts] = useState('')
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [screenName, setScreenName] = useState<string | null>(initialScreenName)
  const [active, setActive] = useState(hasExisting)

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy('save'); setMsg(''); setErr('')
    try {
      const res = await fetch('/api/viralx/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumer_key: ck.trim(), consumer_secret: cs.trim(),
          access_token: at.trim(), access_token_secret: ats.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setMsg(`Verified. ViralX will post as @${data.x_screen_name}.`)
      setScreenName(data.x_screen_name)
      setActive(true)
      setCk(''); setCs(''); setAt(''); setAts('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!confirm('Remove your saved X credentials? You can paste new ones any time.')) return
    setBusy('delete'); setMsg(''); setErr('')
    try {
      const res = await fetch('/api/viralx/credentials', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setMsg('Credentials removed.')
      setScreenName(null)
      setActive(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-card)', border: '1px solid var(--rule-strong)',
    borderRadius: 10, fontSize: 13, fontFamily: 'var(--mono)',
    color: 'var(--ink)', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {active && screenName && (
        <div style={{
          padding: '12px 16px', background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>
            Connected. ViralX posts as <strong>@{screenName}</strong>.
          </span>
          <button
            type="button" onClick={remove} disabled={busy !== null}
            style={{
              fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase',
              letterSpacing: '0.04em', padding: '6px 12px', borderRadius: 999,
              border: '1px solid var(--rule-strong)', background: 'var(--bg-card)',
              color: 'var(--ink-dim)', cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy === 'delete' ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}

      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Consumer Key (API Key)" value={ck} setValue={setCk} placeholder="abc123…" />
        <Field label="Consumer Secret (API Secret)" value={cs} setValue={setCs} placeholder="…" />
        <Field label="Access Token" value={at} setValue={setAt} placeholder="123-abc…" />
        <Field label="Access Token Secret" value={ats} setValue={setAts} placeholder="…" />

        {err && (
          <p style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, color: '#dc2626', fontSize: 13, margin: 0 }}>
            {err}
          </p>
        )}
        {msg && (
          <p style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: 'var(--ink)', fontSize: 13, margin: 0 }}>
            {msg}
          </p>
        )}

        <button
          type="submit" disabled={busy !== null || !ck || !cs || !at || !ats}
          style={{
            height: 48, borderRadius: 10, border: 'none',
            background: ck && cs && at && ats ? 'var(--accent)' : 'var(--bg-card)',
            color: ck && cs && at && ats ? 'var(--accent-ink)' : 'var(--ink-faint)',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy === 'save' ? 'Verifying with X…' : active ? 'Replace credentials' : 'Save & verify'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label, value, setValue, placeholder,
}: { label: string; value: string; setValue: (s: string) => void; placeholder: string }) {
  return (
    <div>
      <label
        style={{
          display: 'block', fontSize: 11, fontFamily: 'var(--mono)',
          color: 'var(--ink-faint)', textTransform: 'uppercase',
          letterSpacing: '0.06em', marginBottom: 6, paddingLeft: 4,
        }}
      >
        {label}
      </label>
      <input
        type="password" required autoComplete="off" spellCheck={false}
        value={value} onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'var(--bg-card)', border: '1px solid var(--rule-strong)',
          borderRadius: 10, fontSize: 13, fontFamily: 'var(--mono)',
          color: 'var(--ink)', outline: 'none',
        }}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MeDTO } from '@/lib/opc-types'

interface Props {
  initial: MeDTO
}

export default function SettingsForm({ initial }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [name, setName] = useState(initial.name ?? '')
  const [bio, setBio] = useState(initial.bio ?? '')
  const [twitter, setTwitter] = useState(initial.twitter ?? '')
  const [site, setSite] = useState(initial.site ?? '')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setOkMsg(null)

    const trimmedName = name.trim()
    if (!trimmedName) return setError('Display name is required.')
    if (trimmedName.length > 80) return setError('Display name max 80 chars.')
    if (bio.trim().length > 280) return setError('Bio max 280 chars.')
    if (site.trim() && !/^https?:\/\//i.test(site.trim())) {
      return setError('Site URL must start with http(s)://')
    }

    setPending(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          bio: bio.trim() || null,
          twitter: twitter.trim() || null,
          site: site.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.')
      setOkMsg('Saved.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="submit-form" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
      <label>
        <span className="label-key">Display name <em>required · ≤ 80 chars</em></span>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={80}
          disabled={pending}
          required
        />
      </label>

      <label>
        <span className="label-key">Bio <em>optional · ≤ 280 chars</em></span>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="One sentence about you."
          disabled={pending}
        />
      </label>

      <div className="form-row two">
        <label>
          <span className="label-key">Twitter / X handle</span>
          <input
            type="text"
            value={twitter}
            onChange={e => setTwitter(e.target.value)}
            placeholder="@yourhandle"
            maxLength={50}
            disabled={pending}
          />
        </label>
        <label>
          <span className="label-key">Website</span>
          <input
            type="url"
            value={site}
            onChange={e => setSite(e.target.value)}
            placeholder="https://yoursite.com"
            maxLength={200}
            disabled={pending}
          />
        </label>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 10,
            color: '#dc2626',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      {okMsg && (
        <div
          style={{
            padding: '12px 14px',
            background: '#f0fdf4',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 10,
            color: '#15803d',
            fontSize: 13,
          }}
        >
          {okMsg}
        </div>
      )}

      <div className="submit-footer">
        <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
          {initial.email}
        </span>
        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

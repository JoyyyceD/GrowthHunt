'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MediaUpload from '@/lib/picolaunch/MediaUpload'
import type { ChampionDTO } from '@/lib/opc-types'

interface Props {
  initial: ChampionDTO
}

const CATEGORIES = [
  'AI tools',
  'Developer tools',
  'Marketing',
  'Sales',
  'Productivity',
  'Design',
  'Data',
  'Other',
]

export default function EditForm({ initial }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [name, setName] = useState(initial.name)
  const [tagline, setTagline] = useState(initial.tagline)
  const [about, setAbout] = useState(initial.about ?? '')
  const [url, setUrl] = useState(initial.url ?? 'https://')
  const [category, setCategory] = useState(initial.category ?? CATEGORIES[0])
  const [hue, setHue] = useState(initial.hue ?? '#e84e1b')
  const [founderType, setFounderType] = useState(initial.founderType ?? '')
  const [byName, setByName] = useState(initial.by ?? '')
  const [status, setStatus] = useState<'live' | 'soon'>(
    initial.status === 'Soon' ? 'soon' : 'live',
  )

  const [logo, setLogo] = useState<File | string | null>(initial.logoUrl)
  const [shot1, setShot1] = useState<File | string | null>(initial.image1Url)
  const [shot2, setShot2] = useState<File | string | null>(initial.image2Url)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setOkMsg(null)

    const trimmedName = name.trim()
    const trimmedTagline = tagline.trim()
    if (!trimmedName) return setError('Name is required.')
    if (!trimmedTagline) return setError('Tagline is required.')
    if (about.trim().length > 1000) return setError('About max 1000 chars.')
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) {
      return setError('URL must start with http(s)://')
    }

    setPending(true)
    try {
      // Step 1: PATCH the metadata
      const patchRes = await fetch(`/api/champions/${encodeURIComponent(initial.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          tagline: trimmedTagline,
          about: about.trim() || null,
          url: url.trim() || null,
          category,
          hue,
          founderType: founderType.trim() || null,
          by: byName.trim() || null,
          status,
        }),
      })
      const patchJson = await patchRes.json()
      if (!patchRes.ok) {
        throw new Error(patchJson.error ?? 'Failed to save.')
      }

      // Step 2: upload any newly-picked media (Files only, not the existing URL strings)
      const uploads: Promise<unknown>[] = []
      if (logo instanceof File) uploads.push(uploadMedia(initial.id, 'logo', logo))
      if (shot1 instanceof File) uploads.push(uploadMedia(initial.id, 'screenshot1', shot1))
      if (shot2 instanceof File) uploads.push(uploadMedia(initial.id, 'screenshot2', shot2))
      if (uploads.length) await Promise.all(uploads)

      setOkMsg('Saved.')
      router.refresh()
      // The freshly-uploaded media URLs come back via revalidation; reset File objects
      setPending(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      setPending(false)
    }
  }

  const onDelete = async () => {
    if (deleting) return
    if (!window.confirm(`Delete "${initial.name}"? This can't be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/champions/${encodeURIComponent(initial.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Delete failed.')
      }
      router.push('/account/launches')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setDeleting(false)
    }
  }

  return (
    <>
      <form className="submit-form" onSubmit={onSubmit}>
        <div className="form-row two">
          <label>
            <span className="label-key">Name <em>required</em></span>
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
            <span className="label-key">By <em>founder name</em></span>
            <input
              type="text"
              value={byName}
              onChange={e => setByName(e.target.value)}
              placeholder="Jane Doe"
              maxLength={80}
              disabled={pending}
            />
          </label>
        </div>

        <label>
          <span className="label-key">Tagline <em>≤ 100 chars</em></span>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            maxLength={100}
            disabled={pending}
            required
          />
        </label>

        <label>
          <span className="label-key">About <em>optional · ≤ 1000 chars</em></span>
          <textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            rows={5}
            maxLength={1000}
            disabled={pending}
          />
        </label>

        <div className="form-row two">
          <label>
            <span className="label-key">Website</span>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            <span className="label-key">Founder type <em>optional</em></span>
            <input
              type="text"
              value={founderType}
              onChange={e => setFounderType(e.target.value)}
              maxLength={80}
              disabled={pending}
            />
          </label>
        </div>

        <div className="form-row two">
          <label>
            <span className="label-key">Category</span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={pending}
            >
              {CATEGORIES.map(c => (
                <option key={c}>{c}</option>
              ))}
              {!CATEGORIES.includes(category) && <option key={category}>{category}</option>}
            </select>
          </label>
          <label>
            <span className="label-key">Brand color</span>
            <input
              type="color"
              value={hue}
              onChange={e => setHue(e.target.value)}
              disabled={pending}
            />
          </label>
        </div>

        <label>
          <span className="label-key">Status</span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as 'live' | 'soon')}
            disabled={pending}
          >
            <option value="live">Live now</option>
            <option value="soon">Coming soon</option>
          </select>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <MediaUpload label="Logo" hint="square" value={logo} onChange={setLogo} aspect="1/1" />
          <MediaUpload label="Screenshot 1" value={shot1} onChange={setShot1} aspect="3/2" />
          <MediaUpload label="Screenshot 2" value={shot2} onChange={setShot2} aspect="3/2" />
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
          <Link
            href={`/picolaunch/${initial.id}`}
            style={{
              fontSize: 13,
              color: 'var(--ink-faint)',
              textDecoration: 'none',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            ← Back to launch
          </Link>
          <button type="submit" className="primary-btn" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <div
        style={{
          marginTop: 56,
          padding: '24px 28px',
          border: '1px solid rgba(220,38,38,0.25)',
          borderRadius: 12,
          background: '#fff8f7',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#a8323b',
            marginBottom: 8,
          }}
        >
          Danger zone
        </div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400, margin: '0 0 8px' }}>
          Delete this launch
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-dim)', margin: '0 0 16px', lineHeight: 1.5 }}>
          The launch is removed from the public listing. Comments and votes are kept (in case you
          undo). This action returns 404 to visitors.
        </p>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          style={{
            background: '#a8323b',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 500,
            cursor: deleting ? 'wait' : 'pointer',
          }}
        >
          {deleting ? 'Deleting…' : 'Delete launch'}
        </button>
      </div>
    </>
  )
}

async function uploadMedia(
  slug: string,
  slot: 'logo' | 'screenshot1' | 'screenshot2',
  file: File,
) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(
    `/api/champions/${encodeURIComponent(slug)}/media?slot=${slot}`,
    { method: 'POST', body: fd },
  )
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(`Upload ${slot} failed: ${j.error ?? res.status}`)
  }
}

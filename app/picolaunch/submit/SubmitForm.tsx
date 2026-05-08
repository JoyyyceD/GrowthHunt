'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MediaUpload from '@/lib/picolaunch/MediaUpload'

interface Props {
  defaultBy: string | null
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

export default function SubmitForm({ defaultBy }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [about, setAbout] = useState('')
  const [url, setUrl] = useState('https://')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [hue, setHue] = useState('#e84e1b')
  const [founderType, setFounderType] = useState('')
  const [byName, setByName] = useState(defaultBy ?? '')
  const [status, setStatus] = useState<'live' | 'soon'>('live')

  const [logo, setLogo] = useState<File | null>(null)
  const [shot1, setShot1] = useState<File | null>(null)
  const [shot2, setShot2] = useState<File | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)

    const trimmedName = name.trim()
    const trimmedTagline = tagline.trim()
    if (!trimmedName) return setError('Name is required.')
    if (trimmedName.length > 80) return setError('Name max 80 chars.')
    if (!trimmedTagline) return setError('Tagline is required.')
    if (trimmedTagline.length > 100) return setError('Tagline max 100 chars.')
    if (about.trim().length > 1000) return setError('About max 1000 chars.')
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) return setError('URL must start with http(s)://')

    setPending(true)
    try {
      // Step 1: create the champion row
      const createRes = await fetch('/api/champions', {
        method: 'POST',
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
      const createJson = await createRes.json()
      if (!createRes.ok) {
        if (createRes.status === 429) {
          throw new Error(`Rate limited. Try again in ${createJson.retryAfterSec}s.`)
        }
        throw new Error(createJson.error ?? 'Failed to create launch.')
      }
      const slug: string = createJson.champion.id

      // Step 2: upload media in parallel (only what was provided)
      const uploads: Promise<unknown>[] = []
      if (logo) uploads.push(uploadMedia(slug, 'logo', logo))
      if (shot1) uploads.push(uploadMedia(slug, 'screenshot1', shot1))
      if (shot2) uploads.push(uploadMedia(slug, 'screenshot2', shot2))
      if (uploads.length) await Promise.all(uploads)

      router.push(`/picolaunch/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.')
      setPending(false)
    }
  }

  return (
    <form className="submit-form" onSubmit={onSubmit}>
      <div className="form-row two">
        <label>
          <span className="label-key">Name <em>required</em></span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your AI startup"
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
          placeholder="One sentence — what does it do?"
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
          placeholder="What it does, who it's for, why now."
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
            placeholder="https://yourstartup.com"
            disabled={pending}
          />
        </label>
        <label>
          <span className="label-key">Founder type <em>optional</em></span>
          <input
            type="text"
            value={founderType}
            onChange={e => setFounderType(e.target.value)}
            placeholder="e.g. Solo founder, ex-Stripe"
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
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
        <MediaUpload
          label="Logo"
          hint="square"
          value={logo}
          onChange={f => setLogo(f as File | null)}
          aspect="1/1"
        />
        <MediaUpload
          label="Screenshot 1"
          value={shot1}
          onChange={f => setShot1(f as File | null)}
          aspect="3/2"
        />
        <MediaUpload
          label="Screenshot 2"
          value={shot2}
          onChange={f => setShot2(f as File | null)}
          aspect="3/2"
        />
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

      <div className="submit-footer">
        <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
          Auto-published · Edit anytime
        </span>
        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? 'Publishing…' : 'Publish launch →'}
        </button>
      </div>
    </form>
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
  return res
}

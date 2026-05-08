'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  label: string
  hint?: string
  value: File | string | null
  onChange: (next: File | string | null) => void
  accept?: string
  aspect?: string // e.g. '1/1', '3/2'
}

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])

export default function MediaUpload({
  label,
  hint,
  value,
  onChange,
  accept = 'image/*',
  aspect,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (value instanceof File) {
      const u = URL.createObjectURL(value)
      setObjectUrl(u)
      return () => URL.revokeObjectURL(u)
    }
    setObjectUrl(null)
  }, [value])

  const previewUrl = value instanceof File ? objectUrl : (typeof value === 'string' ? value : null)

  const accept_ = (file: File) => {
    if (!ALLOWED.has(file.type)) {
      setError('Use PNG, JPG, WebP, GIF, or SVG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`Too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`)
      return
    }
    setError(null)
    onChange(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="label-key">{label}{hint ? <em> ({hint})</em> : null}</span>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files?.[0]
          if (f) accept_(f)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          background: 'var(--bg-elev)',
          border: `1px dashed ${drag ? 'var(--ink)' : 'var(--rule-strong)'}`,
          borderRadius: 8,
          padding: previewUrl ? 10 : 22,
          cursor: 'pointer',
          textAlign: 'center',
          minHeight: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
          aspectRatio: aspect,
          transition: 'border-color 0.15s',
        }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }}
          />
        ) : (
          <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
            Drop or click to upload
            <span style={{ display: 'block', fontSize: 11, marginTop: 4, color: 'var(--ink-faint)' }}>
              PNG / JPG / WebP / SVG · 2 MB max
            </span>
          </span>
        )}
      </div>

      {previewUrl && (
        <button
          type="button"
          onClick={() => { setError(null); onChange(null) }}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 0,
            color: 'var(--ink-faint)',
            fontSize: 11,
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Remove
        </button>
      )}

      {error && (
        <span style={{ fontSize: 12, color: '#a8323b' }}>{error}</span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) accept_(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

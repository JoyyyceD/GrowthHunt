'use client'
/** /scout/[id]/assets — brand asset pool: upload images Scout can reference (decision 2.8). */
import { use, useCallback, useEffect, useRef, useState } from 'react'
import { LeftRail, btnPrimary } from '../../ui'

interface Asset { name: string; url: string; created_at: string }

export default function ScoutAssets({ params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = use(params)
  const [assets, setAssets] = useState<Asset[]>([])
  const [limit, setLimit] = useState(3)
  const [brandColor, setBrandColor] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/scout/assets?ws=${workspaceId}`)
    if (!res.ok) return
    const data = await res.json()
    setAssets(data.assets || [])
    setLimit(data.limit ?? 3)
    setBrandColor(data.brandColor)
  }, [workspaceId])

  useEffect(() => { void load() }, [load])

  async function upload(file: File) {
    setErr('')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/scout/assets?ws=${workspaceId}`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setErr(data.error || 'upload failed')
      else await load()
    } finally {
      setBusy(false)
    }
  }

  const userAssets = assets.filter(a => !a.name.startsWith('logo'))
  const logo = assets.find(a => a.name.startsWith('logo'))

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <LeftRail workspaceId={workspaceId} workspaceName="" active="files" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h1 className="serif" style={{ fontSize: 30, margin: '0 0 6px' }}>Brand assets</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '0 0 24px' }}>
            Upload product shots and brand visuals — I reference them when drafting posts. {userAssets.length}/{limit} used · max 5MB each.
          </p>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || userAssets.length >= limit}
            style={{
              width: '100%', padding: '36px 0', borderRadius: 12, border: '1.5px dashed var(--rule-strong)',
              background: 'var(--bg-elev)', color: 'var(--ink-dim)', fontSize: 14, cursor: 'pointer',
              opacity: busy || userAssets.length >= limit ? 0.5 : 1, marginBottom: 10,
            }}
          >
            {busy ? 'Uploading…' : userAssets.length >= limit ? `Asset limit reached (${limit})` : 'Click to upload — PNG · JPG · WebP · GIF'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }}
          />
          {err && <div style={{ fontSize: 13, color: 'var(--warn)', marginBottom: 10 }}>{err}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginTop: 18 }}>
            {logo && (
              <div style={{ border: '1px solid var(--accent-border)', borderRadius: 12, background: 'var(--bg-elev)', padding: 12 }}>
                <img src={logo.url} alt="Brand logo" style={{ width: '100%', height: 110, objectFit: 'contain' }} />
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>Brand logo</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Auto-fetched</div>
              </div>
            )}
            {userAssets.map(a => (
              <div key={a.name} style={{ border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)', padding: 12 }}>
                <img src={a.url} alt={a.name} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11.5, color: 'var(--ink-dim)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name.replace(/^\d+-/, '')}</div>
              </div>
            ))}
          </div>

          {brandColor && (
            <div style={{ marginTop: 28 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}><span className="dot" />Palette</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: brandColor, border: '1px solid var(--rule)' }} />
                <span className="mono" style={{ fontSize: 12 }}>{brandColor}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

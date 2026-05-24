'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Workspace } from '@/lib/workspace/types'

export function WorkspaceList({ initialWorkspaces }: { initialWorkspaces: Workspace[] }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces)
  const [creating, setCreating] = useState(initialWorkspaces.length === 0)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [oneLiner, setOneLiner] = useState('')
  const [emoji, setEmoji] = useState('')
  const [color, setColor] = useState('#e84e1b')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), url: url.trim(), one_liner: oneLiner.trim() || undefined, emoji: emoji || undefined, brand_color: color }),
      })
      const data = await res.json()
      if (!res.ok || !data.workspace) {
        setErr(data.error || 'Could not create workspace.')
        return
      }
      setWorkspaces((prev) => [data.workspace, ...prev])
      setCreating(false)
      setName(''); setUrl(''); setOneLiner(''); setEmoji('')
    } catch {
      setErr('Network error — try again.')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elev)',
    border: '1.5px solid var(--rule-strong)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14.5,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
  }

  return (
    <div>
      {workspaces.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
          {workspaces.map((w) => (
            <Link key={w.id} href={`/workspace/${w.id}`} style={{ textDecoration: 'none', border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 22px', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: w.brand_color || 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {w.emoji || w.name[0]?.toUpperCase() || 'G'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, color: 'var(--ink)' }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
                    {w.url.replace(/^https?:\/\//, '')}
                  </div>
                </div>
              </div>
              {w.one_liner && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{w.one_liner}</p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                {w.positioning && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 7px', borderRadius: 4, background: 'rgba(22,163,74,0.12)', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>positioned</span>}
                {(w.icp_segments?.length ?? 0) > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 7px', borderRadius: 4, background: 'rgba(22,163,74,0.12)', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ICP</span>}
                {w.voice && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 7px', borderRadius: 4, background: 'rgba(22,163,74,0.12)', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>voice</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating ? (
        <form onSubmit={create} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '22px 24px', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, margin: 0 }}>New workspace</h2>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="GrowthHunt" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>URL</label>
            <input required type="text" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="growthhunt.ai" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>One-liner (optional)</label>
            <input value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="All-in-one go-to-market agent for indie founders" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: '0 0 110px' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Emoji</label>
              <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} placeholder="🚀" style={inputStyle} />
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Brand color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ ...inputStyle, padding: 4, height: 44 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="submit" disabled={busy} style={{ background: busy ? 'var(--ink-faint)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Creating…' : 'Create workspace →'}
            </button>
            {workspaces.length > 0 && (
              <button type="button" onClick={() => setCreating(false)} style={{ background: 'transparent', color: 'var(--ink-dim)', border: '1px solid var(--rule-strong)', borderRadius: 999, padding: '12px 18px', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
          {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)} style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + New workspace
        </button>
      )}
    </div>
  )
}

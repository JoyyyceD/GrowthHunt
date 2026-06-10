'use client'
/**
 * /scout — hero entry. POST returns immediately (fire-and-poll); we client-
 * navigate to the workspace, which renders pipeline progress from scout_tasks.
 */
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAvatar, btnPrimary } from './ui'

export default function ScoutHero() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [brief, setBrief] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function start(e: FormEvent) {
    e.preventDefault()
    if (!url.trim() || busy) return
    setErr('')
    setBusy(true)
    try {
      const res = await fetch('/api/scout/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), brief: brief.trim() || undefined }),
      })
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/scout')}`
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || `HTTP ${res.status}`)
        setBusy(false)
        return
      }
      router.push(`/scout/${data.workspaceId}`)
    } catch (e2) {
      setErr((e2 as Error).message)
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 660, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <ScoutAvatar size={64} busy={busy} />
        </div>
        <div className="eyebrow" style={{ marginBottom: 14 }}><span className="dot" />Scout · your AI growth teammate</div>
        <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.12, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
          Drop your URL.<br />I&apos;ll do the rest.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-dim)', margin: '0 0 30px', lineHeight: 1.6 }}>
          In about three minutes I&apos;ll read your site, scope your market, and hand you a full brand playbook —
          plus your first week of posts, ready to ship. Every stat sourced, or it doesn&apos;t ship.
        </p>
        <form onSubmit={start} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="yourproduct.com"
            autoFocus
            style={{
              fontSize: 18, padding: '16px 18px', borderRadius: 12, textAlign: 'center',
              border: '1.5px solid var(--rule-strong)', background: 'var(--bg-elev)', color: 'var(--ink)', outline: 'none',
            }}
          />
          <input
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Anything I should know? e.g. target audience or current goal (optional)"
            style={{
              fontSize: 14, padding: '11px 14px', borderRadius: 10,
              border: '1px solid var(--rule)', background: 'var(--bg-elev)', color: 'var(--ink)', outline: 'none',
            }}
          />
          <button type="submit" disabled={busy || !url.trim()} style={{ ...btnPrimary, fontSize: 16, padding: '13px 24px', opacity: busy || !url.trim() ? 0.6 : 1 }}>
            {busy ? 'Scout is on it…' : 'Hire Scout — free'}
          </button>
        </form>
        {err && <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--warn)' }}>{err}</div>}
      </div>
    </div>
  )
}

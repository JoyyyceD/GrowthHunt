'use client'
/**
 * /scout — hero entry. POST returns immediately (fire-and-poll); we client-
 * navigate to the workspace, which renders pipeline progress from scout_tasks.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAvatar, btnPrimary } from './ui'

export default function ScoutHero() {
  const router = useRouter()
  // Returning users land in their most recent workspace, not the pitch.
  // ?new=1 is the deliberate "start another brand" escape hatch.
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new')) {
      setChecking(false)
      return
    }
    void (async () => {
      try {
        const res = await fetch('/api/workspace')
        if (res.ok) {
          const { workspaces } = await res.json()
          if (workspaces?.length) {
            router.replace(`/scout/${workspaces[0].id}`)
            return
          }
        }
      } catch {
        // fall through to the hero
      }
      setChecking(false)
    })()
  }, [router])

  const [url, setUrl] = useState('')
  const [brief, setBrief] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsInvite, setNeedsInvite] = useState(false)
  const [invite, setInvite] = useState('')
  const [waitEmail, setWaitEmail] = useState('')
  const [waitDone, setWaitDone] = useState(false)

  async function start(e: FormEvent) {
    e.preventDefault()
    if (!url.trim() || busy) return
    setErr('')
    setBusy(true)
    try {
      const res = await fetch('/api/scout/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), brief: brief.trim() || undefined, invite: invite.trim() || undefined }),
      })
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/scout')}`
        return
      }
      const data = await res.json()
      if (!res.ok) {
        if (data.needsInvite) {
          setNeedsInvite(true)
          setErr(invite ? 'That code didn’t work — double-check it, or join the waitlist below.' : '')
        } else {
          setErr(data.error || `HTTP ${res.status}`)
        }
        setBusy(false)
        return
      }
      router.push(`/scout/${data.workspaceId}`)
    } catch (e2) {
      setErr((e2 as Error).message)
      setBusy(false)
    }
  }

  async function joinWaitlist(e: FormEvent) {
    e.preventDefault()
    if (!waitEmail.trim()) return
    const res = await fetch('/api/scout/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: waitEmail.trim() }),
    })
    if (res.ok) setWaitDone(true)
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ScoutAvatar size={56} busy />
      </div>
    )
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
          {needsInvite && (
            <input
              value={invite}
              onChange={e => setInvite(e.target.value)}
              placeholder="Invite code"
              autoFocus
              style={{
                fontSize: 14, padding: '11px 14px', borderRadius: 10, textAlign: 'center', letterSpacing: '0.08em',
                border: '1.5px solid var(--accent-border)', background: 'var(--bg-elev)', color: 'var(--ink)', outline: 'none',
              }}
            />
          )}
          <button type="submit" disabled={busy || !url.trim()} style={{ ...btnPrimary, fontSize: 16, padding: '13px 24px', opacity: busy || !url.trim() ? 0.6 : 1 }}>
            {busy ? 'Scout is on it…' : 'Hire Scout — free'}
          </button>
        </form>
        {err && <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--warn)' }}>{err}</div>}
        {needsInvite && (
          <div style={{ marginTop: 22, padding: '18px 20px', border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--bg-elev)' }}>
            {waitDone ? (
              <div style={{ fontSize: 14, color: 'var(--ink-dim)' }}>You&apos;re on the list — I&apos;ll sniff you out an invite soon. 🐾</div>
            ) : (
              <>
                <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 10 }}>
                  Scout is in private beta. No code? Leave your email and I&apos;ll fetch you one.
                </div>
                <form onSubmit={joinWaitlist} style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={waitEmail}
                    onChange={e => setWaitEmail(e.target.value)}
                    placeholder="you@company.com"
                    type="email"
                    style={{ flex: 1, fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--rule-strong)', background: 'var(--bg)', color: 'var(--ink)', outline: 'none' }}
                  />
                  <button type="submit" style={{ ...btnPrimary, fontSize: 13.5, padding: '10px 18px' }}>Join waitlist</button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

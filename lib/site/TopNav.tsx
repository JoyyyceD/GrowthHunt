'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { readSoftUserEmail, clearSoftUser } from '@/lib/soft-auth'

interface Props {
  /** When provided, this page is the homepage and module/section anchors are local. */
  variant?: 'home' | 'page'
}

interface UserChip {
  email: string | null
  name: string | null
  avatar: string | null
  initials: string
  hue: string
  isGoogle: boolean
}

function deriveInitials(name: string | null | undefined, email: string | null | undefined): string {
  const base = (name || email?.split('@')[0] || 'You').trim()
  return base
    .split(/[\s.@]+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function hashHue(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const HUES = ['#e84e1b', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4']
  return HUES[Math.abs(h) % HUES.length]
}

export function TopNav({ variant = 'page' }: Props) {
  const [chip, setChip] = useState<UserChip | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function flushPendingInvite(userEmail: string | null) {
      if (!userEmail || typeof window === 'undefined') return
      const code = localStorage.getItem('gh-pending-invite-code')
      if (!code) return
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail.toLowerCase(),
          source: 'google-invite',
          inviteCode: code,
        }),
      }).catch(() => { /* non-blocking */ })
      localStorage.removeItem('gh-pending-invite-code')
    }

    function buildChip(opts: { email: string | null; name: string | null; avatar: string | null; isGoogle: boolean }): UserChip {
      const seed = opts.email ?? opts.name ?? 'anon'
      return {
        email: opts.email,
        name: opts.name,
        avatar: opts.avatar,
        initials: deriveInitials(opts.name, opts.email),
        hue: hashHue(seed),
        isGoogle: opts.isGoogle,
      }
    }

    let supabase
    try {
      supabase = createBrowserClient()
    } catch {
      const e = readSoftUserEmail()
      setChip(e ? buildChip({ email: e, name: null, avatar: null, isGoogle: false }) : null)
      setLoaded(true)
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (u) {
        const meta = u.user_metadata as { full_name?: string; avatar_url?: string } | undefined
        setChip(buildChip({
          email: u.email ?? null,
          name: meta?.full_name ?? u.email?.split('@')[0] ?? null,
          avatar: meta?.avatar_url ?? null,
          isGoogle: true,
        }))
        flushPendingInvite(u.email ?? null)
      } else {
        const e = readSoftUserEmail()
        setChip(e ? buildChip({ email: e, name: null, avatar: null, isGoogle: false }) : null)
      }
      setLoaded(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      if (u) {
        const meta = u.user_metadata as { full_name?: string; avatar_url?: string } | undefined
        setChip(buildChip({
          email: u.email ?? null,
          name: meta?.full_name ?? u.email?.split('@')[0] ?? null,
          avatar: meta?.avatar_url ?? null,
          isGoogle: true,
        }))
        flushPendingInvite(u.email ?? null)
      } else {
        const e = readSoftUserEmail()
        setChip(e ? buildChip({ email: e, name: null, avatar: null, isGoogle: false }) : null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Close menu on outside click or Escape key
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch { /* env missing or already out */ }
    clearSoftUser()
    setChip(null)
    router.refresh()
  }

  return (
    <nav className="top">
      <div className="shell row">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <div className="mark" />
          GrowthHunt.ai
        </Link>
        <ul>
          <li>
            {variant === 'home'
              ? <a href="#live">Live tools</a>
              : <Link href="/#live">Live tools</Link>}
          </li>
          <li><Link href="/coming-soon">Coming soon</Link></li>
          <li><Link href="/blog">Blog</Link></li>
        </ul>
        {!loaded ? (
          <span style={{ width: 88 }} />
        ) : chip ? (
          <div ref={popRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-elev)',
                border: '1px solid var(--rule-strong)',
                borderRadius: 999,
                padding: '4px 12px 4px 4px',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                color: 'var(--ink)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <Avatar chip={chip} />
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chip.name ?? chip.email}
              </span>
              <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>▾</span>
            </button>

            {open && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: 240,
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--rule-strong)',
                  borderRadius: 12,
                  padding: 8,
                  zIndex: 60,
                  boxShadow: '0 12px 32px rgba(20,17,13,0.10)',
                }}
              >
                <div style={{ padding: '8px 10px 12px' }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>
                    {chip.name ?? 'You'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                    {chip.email}
                  </div>
                  {!chip.isGoogle && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Email-only · upgrade to submit
                    </div>
                  )}
                </div>
                <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '6px 0' }} />
                <MenuLink href="/picolaunch/account/launches" onClick={() => setOpen(false)}>My launches</MenuLink>
                <MenuLink href="/picolaunch/account/upvotes" onClick={() => setOpen(false)}>Upvotes</MenuLink>
                <MenuLink href="/picolaunch/account/comments" onClick={() => setOpen(false)}>Comments</MenuLink>
                <MenuLink href="/picolaunch/account/settings" onClick={() => setOpen(false)}>Settings</MenuLink>
                <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '6px 0' }} />
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#a8323b',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="cta" style={{ textDecoration: 'none' }}>
            Log in / Sign up
          </Link>
        )}
      </div>
    </nav>
  )
}

function Avatar({ chip }: { chip: UserChip }) {
  if (chip.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={chip.avatar}
        alt=""
        style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: chip.hue,
        color: '#fff',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {chip.initials}
    </span>
  )
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'block',
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 13,
        color: 'var(--ink)',
        textDecoration: 'none',
      }}
      className="topnav-menu-item"
    >
      {children}
    </Link>
  )
}

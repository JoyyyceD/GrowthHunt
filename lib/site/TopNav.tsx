'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { readSoftUserEmail, clearSoftUser } from '@/lib/soft-auth'

interface Props {
  /** When provided, this page is the homepage and module/section anchors are local. */
  variant?: 'home' | 'page'
}

export function TopNav({ variant = 'page' }: Props) {
  const [email, setEmail] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let supabase
    try {
      supabase = createBrowserClient()
    } catch {
      setEmail(readSoftUserEmail())
      setLoaded(true)
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? readSoftUserEmail())
      setLoaded(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? readSoftUserEmail())
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch { /* env missing or already out */ }
    clearSoftUser()
    setEmail(null)
    router.refresh()
  }

  return (
    <nav className="top">
      <div className="shell row">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <div className="mark" />
          GrowthHunt
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
        ) : email ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </span>
            <button
              onClick={handleSignOut}
              className="cta"
              style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--rule-strong)' }}
            >
              Log out
            </button>
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

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChatPanel } from './ChatPanel'
import type { Workspace } from '@/lib/workspace/types'

/**
 * Global floating chat widget — bottom-right on every authed page.
 *
 * Server component above (in app/layout.tsx) decides whether to render
 * this at all (gated by auth + active workspace). We do a final
 * client-side path filter so the widget is hidden on login / marketing.
 */

const HIDE_ON_PREFIXES = ['/login', '/coming-soon', '/auth', '/blog', '/ab/']

export function FloatingChat({ workspace }: { workspace: Workspace }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false) // collapse when route changes
  }, [pathname])

  const hidden = HIDE_ON_PREFIXES.some((p) => pathname?.startsWith(p)) || pathname === '/gtm'
  if (hidden) return null

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 50 }}>
      {open ? (
        <div style={{ width: 380, maxWidth: 'calc(100vw - 36px)' }}>
          <ChatPanel workspace={workspace} compact onClose={() => setOpen(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open GTM chat"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--ink)', color: 'var(--bg)', border: 'none',
            borderRadius: 999, padding: '12px 18px', fontSize: 13.5, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 6px 24px rgba(20,17,13,0.18)',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
          Ask GTM agent
        </button>
      )}
    </div>
  )
}

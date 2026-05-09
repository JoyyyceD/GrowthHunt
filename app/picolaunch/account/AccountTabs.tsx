'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/picolaunch/account/launches', label: 'My launches' },
  { href: '/picolaunch/account/upvotes', label: 'Upvotes' },
  { href: '/picolaunch/account/comments', label: 'Comments' },
  { href: '/picolaunch/account/settings', label: 'Settings' },
]

export default function AccountTabs() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--rule)',
        marginBottom: 32,
        flexWrap: 'wrap',
      }}
    >
      {TABS.map(t => {
        const active = pathname === t.href || pathname?.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: active ? 'var(--ink)' : 'var(--ink-faint)',
              borderBottom: `2px solid ${active ? 'var(--ink)' : 'transparent'}`,
              marginBottom: -1,
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

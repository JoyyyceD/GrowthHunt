'use client'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
const EDITORIAL_PATHS = ['/ai-tools', '/guides', '/growth-story', '/blog', '/about', '/contact', '/privacy', '/terms', '/affiliate-disclosure', '/editorial-policy']
export function ProductOnlyWidgets({ children }: { children: ReactNode }) {
  const path = usePathname()
  const editorial = path === '/' || EDITORIAL_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
  return editorial ? null : <>{children}</>
}

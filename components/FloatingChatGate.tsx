'use client'

/**
 * Client-side gate that decides whether to mount FloatingChat globally.
 *
 * Conditions to render:
 *   - User is authenticated
 *   - User has at least one workspace (we default to most recently used)
 *
 * This runs on the client on purpose. It is mounted from the root layout, so
 * doing the auth check server-side made every page in the app read cookies via
 * next/headers — which opts the whole route tree out of static rendering and
 * forces `private, no-store` on every response, disabling CDN caching site-wide.
 * Resolving auth after hydration keeps public pages statically prerenderable.
 */
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { Workspace } from '@/lib/workspace/types'
import { FloatingChat } from './FloatingChat'

export function FloatingChatGate() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      let supabase
      try {
        supabase = createBrowserClient()
      } catch {
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setWorkspace(null)
        return
      }

      try {
        const res = await fetch('/api/workspace')
        if (!res.ok) return
        const { workspaces } = (await res.json()) as { workspaces: Workspace[] }
        if (!cancelled) setWorkspace(workspaces?.[0] ?? null)
      } catch {
        /* keep hidden on failure — same as the previous server-side catch */
      }
    }

    resolve()

    let unsubscribe: (() => void) | undefined
    try {
      const supabase = createBrowserClient()
      const { data: sub } = supabase.auth.onAuthStateChange(() => {
        if (!cancelled) resolve()
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    } catch {
      /* no supabase env — nothing to subscribe to */
    }

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  if (!workspace) return null
  return <FloatingChat workspace={workspace} />
}

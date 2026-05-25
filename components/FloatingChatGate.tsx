/**
 * Server-side gate that decides whether to mount FloatingChat globally.
 *
 * Conditions to render:
 *   - User is authenticated
 *   - User has at least one workspace (we default to most recently used)
 */
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner } from '@/lib/workspace/store'
import { FloatingChat } from './FloatingChat'

export async function FloatingChatGate() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const workspaces = await listWorkspacesForOwner(user.id)
    if (workspaces.length === 0) return null
    return <FloatingChat workspace={workspaces[0]!} />
  } catch {
    return null
  }
}

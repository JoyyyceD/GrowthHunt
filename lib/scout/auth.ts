/** Shared auth for /api/scout routes: signed-in user + workspace ownership. */
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import type { Workspace } from '@/lib/workspace/types'

export interface ScoutAuth {
  userId: string
  workspace: Workspace
}

export async function requireWorkspace(workspaceId: string | null | undefined): Promise<ScoutAuth | Response> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  if (!workspaceId) return Response.json({ error: 'workspaceId required' }, { status: 400 })
  const workspace = await getWorkspace(workspaceId)
  if (!workspace || workspace.owner_id !== user.id) {
    return Response.json({ error: 'workspace not found' }, { status: 404 })
  }
  return { userId: user.id, workspace }
}

export async function requireUser(): Promise<{ userId: string } | Response> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  return { userId: user.id }
}

/** SSE response from an async producer; closes when the producer resolves. */
export function sseResponse(producer: (send: (event: unknown) => void) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // client disconnected — pipeline continues; progress is in scout_tasks
        }
      }
      try {
        await producer(send)
      } catch (e) {
        send({ type: 'error', message: (e as Error).message })
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

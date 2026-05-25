/**
 * GET /api/gtm/conversations/[id] — full message history
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { getConversation, listMessages } from '@/lib/orchestrator/conversations'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const conv = await getConversation(id)
  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const ws = await getWorkspace(conv.workspace_id)
  if (!ws || (ws.owner_id && ws.owner_id !== user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const messages = await listMessages(id, 200)
  return NextResponse.json({ conversation: conv, messages })
}

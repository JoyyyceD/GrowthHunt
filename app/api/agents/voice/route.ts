/**
 * POST /api/agents/voice
 * Body: { workspace_id: string, handle?: string, extra?: string[] }
 *
 * Trains voice profile from xhunter tweets + optional extra long-form samples,
 * patches the workspace.voice + voice_handle.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace, patchWorkspace } from '@/lib/workspace/store'
import { trainVoice } from '@/lib/agents/voice'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { workspace_id?: string; handle?: string; extra?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const ws = await getWorkspace(body.workspace_id)
  if (!ws) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const handle = (body.handle || ws.voice_handle || '').toString().trim()
  if (!handle) return NextResponse.json({ error: 'handle required (or set workspace.voice_handle first)' }, { status: 400 })

  const extra = Array.isArray(body.extra)
    ? body.extra.filter((x): x is string => typeof x === 'string').slice(0, 10)
    : undefined

  const out = await trainVoice({ handle, extraSamples: extra })

  const updated = await patchWorkspace(ws.id, {
    voice_handle: handle,
    voice: out.voice,
  })

  return NextResponse.json({ result: out, workspace: updated || ws })
}

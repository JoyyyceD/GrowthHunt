/**
 * POST /api/agents/landing
 * Body: { workspace_id: string, url?: string }
 *
 * Runs the Landing Page Doctor for the given URL (or workspace.url default).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkspace } from '@/lib/workspace/store'
import { runLandingDoctor } from '@/lib/agents/landing'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { workspace_id?: string; url?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const ws = await getWorkspace(body.workspace_id)
  if (!ws) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (ws.owner_id && ws.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const report = await runLandingDoctor({ workspace: ws, url: body.url?.trim() || undefined })
  return NextResponse.json({ report })
}

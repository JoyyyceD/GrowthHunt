/**
 * /api/workspace
 *   GET  → list workspaces for the signed-in user
 *   POST → create a workspace (body: WorkspaceCreate)
 *
 * All ops require an authenticated Supabase session; we still hit the admin
 * client server-side to keep the helpers symmetric with agent flows that
 * already know the ownerId.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { listWorkspacesForOwner, createWorkspace } from '@/lib/workspace/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const workspaces = await listWorkspacesForOwner(user.id)
  return NextResponse.json({ workspaces })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { name?: string; url?: string; one_liner?: string; brand_color?: string; emoji?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.name?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 })
  }

  const workspace = await createWorkspace(user.id, {
    name: body.name,
    url: body.url,
    one_liner: body.one_liner,
    brand_color: body.brand_color,
    emoji: body.emoji,
  })
  if (!workspace) return NextResponse.json({ error: 'Could not create workspace' }, { status: 500 })

  return NextResponse.json({ workspace })
}

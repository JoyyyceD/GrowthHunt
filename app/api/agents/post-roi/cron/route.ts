/**
 * Cron: weekly self-post ROI digest per workspace.
 * Schedule: Sundays 12:00 UTC.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ingestSelfPosts, buildRoiDigest, persistDigest } from '@/lib/agents/post-roi'
import type { Workspace } from '@/lib/workspace/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data } = await admin
    .from('gtm_workspaces')
    .select('*')
    .not('voice_handle', 'is', null)
    .limit(20)
  const summary = { workspaces: 0, ingested: 0, errors: 0 }
  for (const ws of (data || []) as Workspace[]) {
    if (!ws.voice_handle) continue
    summary.workspaces += 1
    try {
      const i = await ingestSelfPosts(ws)
      summary.ingested += i.upserted
      const digest = await buildRoiDigest(ws)
      await persistDigest(digest)
    } catch (err) {
      summary.errors += 1
      console.error('[post-roi-cron] failed for', ws.id, (err as Error).message)
    }
  }
  return NextResponse.json(summary)
}

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { championToDTO, hotScore } from '@/lib/opc-mappers'
import type { ChampionRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

// GET /api/issues/current
// "This week's issue" = up to 12 most recently created champions, sorted by hot.
// Editorial source comes first, then user submissions.
export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('champions')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[GET /api/issues/current]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as ChampionRow[]
  const sorted = rows
    .map((r) => ({
      r,
      score: hotScore(
        r.upvote_count,
        (Date.now() - Date.parse(r.created_at)) / 3_600_000
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.r)

  // Issue number — placeholder. Once `issues` table lands, derive from there.
  // Using 14 to match the static mock copy ("Issue No. 14").
  return NextResponse.json({
    issue: {
      number: 14,
      weekOf: '2026-04-20',
      championCount: sorted.length,
    },
    champions: sorted.map(championToDTO),
  })
}

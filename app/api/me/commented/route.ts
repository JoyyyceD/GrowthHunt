import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { championToDTO } from '@/lib/opc-mappers'
import type { ChampionRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

// GET /api/me/commented — distinct champions the current user commented on
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('comments')
    .select('champion:champions!champion_id(*)')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[GET /api/me/commented]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const seen = new Set<string>()
  const champions: ReturnType<typeof championToDTO>[] = []
  for (const row of data ?? []) {
    const c = row.champion as ChampionRow | null
    if (!c || c.deleted_at != null) continue
    if (seen.has(c.id)) continue
    seen.add(c.id)
    champions.push(championToDTO(c))
  }

  return NextResponse.json({ champions })
}

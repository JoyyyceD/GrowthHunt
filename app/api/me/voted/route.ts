import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { championToDTO } from '@/lib/opc-mappers'
import type { ChampionRow } from '@/lib/opc-types'

export const dynamic = 'force-dynamic'

// GET /api/me/voted — champions the current user upvoted
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('votes')
    .select('champion:champions!champion_id(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[GET /api/me/voted]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as Array<{ champion: ChampionRow | null }>
  const champions = rows
    .map((r) => r.champion)
    .filter((c): c is ChampionRow => !!c && c.deleted_at == null)
    .map(championToDTO)

  return NextResponse.json({ champions })
}

import { createServerClient } from '@/lib/supabase/server'
import { championToDTO, hotScore } from '@/lib/opc-mappers'
import type { ChampionDTO } from '@/lib/opc-types'
import type { ChampionRow } from '@/lib/opc-types'

export type LeaderboardRange = 'all' | 'month' | 'week' | 'new'

// ── Leaderboard ──────────────────────────────────────────────────────────────
// Default ranking: upvote_count + comment_count (community engagement).
// 'new' range short-circuits sorting and orders by created_at desc instead.
// Time-window filters narrow the row set BEFORE sorting.
export async function getLeaderboard(
  range: LeaderboardRange = 'all',
): Promise<ChampionDTO[]> {
  const supabase = await createServerClient()
  let q = supabase
    .from('champions')
    .select('*')
    .is('deleted_at', null)
    .limit(200)

  if (range === 'month') {
    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString()
    q = q.gte('created_at', cutoff)
  } else if (range === 'week') {
    const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString()
    q = q.gte('created_at', cutoff)
  }

  // Stable secondary order: newest first on score ties.
  q = q.order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) {
    console.error('[picolaunch/fetch] getLeaderboard', error)
    return []
  }

  let rows = (data ?? []) as ChampionRow[]
  if (range !== 'new') {
    rows = rows
      .slice()
      .sort(
        (a, b) =>
          b.upvote_count + b.comment_count - (a.upvote_count + a.comment_count),
      )
  }
  return rows.map(championToDTO)
}

// ── Legacy helper retained for non-listing callers (sitemap etc.) ────────────
export async function getAllChampions(
  sort: 'hot' | 'new' | 'top' = 'hot',
): Promise<ChampionDTO[]> {
  const supabase = await createServerClient()
  let q = supabase
    .from('champions')
    .select('*')
    .is('deleted_at', null)
    .limit(200)

  if (sort === 'new') q = q.order('created_at', { ascending: false })
  else if (sort === 'top') q = q.order('upvote_count', { ascending: false })
  else q = q.order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) {
    console.error('[picolaunch/fetch] getAllChampions', error)
    return []
  }

  let rows = (data ?? []) as ChampionRow[]
  if (sort === 'hot') {
    rows = rows
      .map((r) => ({
        r,
        score: hotScore(
          r.upvote_count,
          (Date.now() - Date.parse(r.created_at)) / 3_600_000,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r)
  }
  return rows.map(championToDTO)
}

export async function getChampionWithComments(slug: string) {
  const supabase = await createServerClient()
  const { data: row, error } = await supabase
    .from('champions')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !row) return null
  const champion = championToDTO(row as ChampionRow)

  const { data: commentsData } = await supabase
    .from('comments')
    .select('*, author:profiles!author_id(*)')
    .eq('champion_id', (row as ChampionRow).id)
    .order('created_at', { ascending: false })
    .limit(50)

  const comments = (commentsData ?? []).map((c: { id: string; body: string; created_at: string; author: { display_name: string | null; avatar_url: string | null } | null }) => ({
    id: c.id,
    body: c.body,
    createdAt: Date.parse(c.created_at),
    authorName: c.author?.display_name ?? 'Someone',
    authorAvatar: c.author?.avatar_url ?? null,
  }))

  return { champion, comments }
}

export async function getAllChampionSlugs(): Promise<string[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('champions')
    .select('slug')
    .is('deleted_at', null)
    .limit(1000)
  return (data ?? []).map((r: { slug: string }) => r.slug)
}

// Sitemap-friendly variant — includes created_at so we can emit a real
// lastmod instead of `new Date()` (Google starts ignoring lastmod when
// every URL claims to have been updated today).
export async function getAllChampionMeta(): Promise<{ slug: string; createdAt: string }[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('champions')
    .select('slug, created_at')
    .is('deleted_at', null)
    .limit(1000)
  return (data ?? []).map((r: { slug: string; created_at: string }) => ({
    slug: r.slug,
    createdAt: r.created_at,
  }))
}

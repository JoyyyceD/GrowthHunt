/**
 * For a given (category, archetype) pair, fetch the top-N early-stage exemplar
 * tweets to seed a day card in the 14-day calendar.
 *
 * Strategy with category-aware fallback (since some category × archetype cells
 * are sparse):
 *   1. early-stage in target category × archetype, ordered by like_count
 *   2. early-stage in 'founder' category × archetype (founders post diverse types)
 *   3. early-stage in any category × archetype
 *   4. any tweet × archetype (drop early-stage requirement) — last resort
 *
 * Stops at the first step that returns >= minCount results.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { XhunterCategory } from './classify'

export interface Exemplar {
  id: string
  handle: string
  text: string
  url: string
  like_count: number
  view_count: number
  author_name: string | null
  author_avatar: string | null
  category: string
  account_type: string
}

export interface ExemplarOpts {
  category: XhunterCategory | null
  archetype: string
  limit?: number       // how many to return (default 3)
  minCount?: number    // minimum acceptable per stage before falling through (default 3)
}

export async function fetchExemplars(
  sb: SupabaseClient,
  opts: ExemplarOpts
): Promise<Exemplar[]> {
  const { category, archetype, limit = 3, minCount = 3 } = opts

  // Helper: run one supabase query — returns rows or [] on error
  async function q(filterCategory: string | null, requireEarlyStage: boolean): Promise<Exemplar[]> {
    let query = sb
      .from('xhunter_tweets')
      .select(
        'id, handle, text, url, like_count, view_count, author_name, author_avatar, ' +
        'xhunter_accounts!inner(category, account_type)'
      )
      .contains('tags', requireEarlyStage ? [archetype, 'early-stage'] : [archetype])
      .eq('is_rt', false)
      .gte('like_count', 100)
      .order('like_count', { ascending: false })
      .limit(limit * 4)

    if (filterCategory) {
      query = query.eq('xhunter_accounts.category', filterCategory)
    }

    const { data, error } = await query
    if (error || !data) return []

    type Row = {
      id: string; handle: string; text: string; url: string
      like_count: number; view_count: number
      author_name: string | null; author_avatar: string | null
      xhunter_accounts: { category: string; account_type: string } | { category: string; account_type: string }[]
    }
    return (data as unknown as Row[]).map(r => {
      const acc = Array.isArray(r.xhunter_accounts) ? r.xhunter_accounts[0] : r.xhunter_accounts
      return {
        id: r.id,
        handle: r.handle,
        text: r.text,
        url: r.url,
        like_count: r.like_count,
        view_count: r.view_count,
        author_name: r.author_name,
        author_avatar: r.author_avatar,
        category: acc?.category ?? '',
        account_type: acc?.account_type ?? '',
      }
    })
  }

  // Stage 1: target category, early-stage
  if (category) {
    const a = await q(category, true)
    if (a.length >= minCount) return a.slice(0, limit)
  }

  // Stage 2: founder category, early-stage (founders post diverse types)
  const b = await q('founder', true)
  if (b.length >= minCount) return b.slice(0, limit)

  // Stage 3: any category, early-stage
  const c = await q(null, true)
  if (c.length >= minCount) return c.slice(0, limit)

  // Stage 4: any category, no early-stage requirement
  const d = await q(null, false)
  return d.slice(0, limit)
}

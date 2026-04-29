import { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import Lab from './Lab'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Xhunter — AI startup viral tweet templates',
  description:
    '3,447 tweets from 277 AI startup accounts, filterable by category, founder vs official, and content tag. Find the templates closest to your startup.',
}

export default async function XhunterPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const pageSize = user ? 50 : 10

  // Server-render the first page directly (no API hop). Tier check happens here.
  const { data: tweets } = await supabase
    .from('xhunter_tweets')
    .select(
      'id, handle, text, url, created_at_x, like_count, retweet_count, view_count, bookmark_count, is_rt, media_url, author_name, author_avatar, author_followers, is_blue_verified, tags'
    )
    .order('like_count', { ascending: false })
    .range(0, pageSize - 1)

  const tweetHandles = [...new Set((tweets ?? []).map(t => t.handle))]
  const { data: accs } = tweetHandles.length > 0
    ? await supabase
        .from('xhunter_accounts')
        .select('handle, display_label, category, account_type, company')
        .in('handle', tweetHandles)
    : { data: [] }

  const accountByHandle = new Map((accs ?? []).map(a => [a.handle, a]))
  const initial = (tweets ?? []).map((t, idx) => ({
    ...t,
    account: accountByHandle.get(t.handle) || null,
    locked: !user && idx >= 5,
  }))

  // Approximate stats for the hero — count once per request, not per filter change
  const [{ count: totalTweets }, { count: totalAccounts }, { count: totalViral }] = await Promise.all([
    supabase.from('xhunter_tweets').select('*', { count: 'exact', head: true }),
    supabase.from('xhunter_accounts').select('*', { count: 'exact', head: true }),
    supabase.from('xhunter_tweets').select('*', { count: 'exact', head: true }).contains('tags', ['viral']),
  ])

  return (
    <Lab
      initial={initial}
      isAuthed={!!user}
      stats={{
        tweets: totalTweets ?? 0,
        accounts: totalAccounts ?? 0,
        viral: totalViral ?? 0,
      }}
    />
  )
}

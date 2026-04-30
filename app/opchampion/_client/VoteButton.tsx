'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { readSoftUserEmail } from '@/lib/soft-auth'

interface Props {
  slug: string
  initialCount: number
}

const STORAGE_KEY = 'opc-voted'

function getLocalVotes(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function setLocalVotes(votes: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(votes)) } catch { /* */ }
}

export default function VoteButton({ slug, initialCount }: Props) {
  const router = useRouter()
  const [voted, setVoted] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setVoted(getLocalVotes().includes(slug))
  }, [slug])

  const handleVote = async () => {
    if (voted || loading) return
    setLoading(true)

    // If user is signed in (Supabase) we can vote without redirecting.
    // If only soft auth → still allow (server will accept anon vote keyed by IP+day).
    // If neither → bounce to login.
    const soft = readSoftUserEmail()
    let supabaseUser = null
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase.auth.getUser()
      supabaseUser = data.user
    } catch { /* env missing */ }

    if (!supabaseUser && !soft) {
      router.push(`/login?next=/opchampion/${encodeURIComponent(slug)}`)
      return
    }

    try {
      const res = await fetch(`/api/champions/${encodeURIComponent(slug)}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const v = getLocalVotes()
        if (!v.includes(slug)) setLocalVotes([...v, slug])
        setVoted(true)
        setCount(c => c + 1)
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  return (
    <button
      type="button"
      className={`vote-btn ${voted ? 'voted' : ''}`}
      onClick={handleVote}
      disabled={voted || loading}
      title={voted ? 'Already upvoted' : 'Upvote'}
      aria-label={voted ? 'Already upvoted' : 'Upvote'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M7 14l5-5 5 5"/>
      </svg>
      <span>{count}</span>
    </button>
  )
}

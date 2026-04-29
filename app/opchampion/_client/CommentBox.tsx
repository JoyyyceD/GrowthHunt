'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { readSoftUserEmail } from '@/lib/soft-auth'

interface Comment {
  id: string
  body: string
  createdAt: number
  authorName: string
  authorAvatar: string | null
}

interface Props {
  slug: string
  initialComments: Comment[]
}

function relTime(ts: number): string {
  const diff = Math.max(1, (Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function CommentBox({ slug, initialComments }: Props) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    if (readSoftUserEmail()) { setAuthed(true); return }
    let supabase
    try { supabase = createBrowserClient() } catch { setAuthed(false); return }
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user || !!readSoftUserEmail())
    })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || posting) return

    if (authed === false) {
      router.push(`/login?next=/opchampion/${encodeURIComponent(slug)}`)
      return
    }

    setPosting(true)
    try {
      const res = await fetch(`/api/champions/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      if (res.ok) {
        const json = await res.json()
        const c = json.comment
        if (c) {
          setComments(prev => [{
            id: c.id,
            body: c.body,
            createdAt: c.createdAt ?? Date.now(),
            authorName: c.author?.name ?? 'You',
            authorAvatar: c.author?.avatar ?? null,
          }, ...prev])
        }
        setBody('')
      }
    } catch { /* silent */ }
    setPosting(false)
  }

  return (
    <div className="comments-block">
      <h4>Discussion <span className="dim">· {comments.length}</span></h4>

      {authed === false ? (
        <div className="comment-locked">
          <p>Sign in to leave a comment. Reading is free for everyone.</p>
          <a className="ghost-btn" href={`/login?next=/opchampion/${encodeURIComponent(slug)}`}>
            Sign in to comment
          </a>
        </div>
      ) : (
        <form className="comment-form" onSubmit={submit}>
          <span className="avatar small" style={{ background: 'var(--accent)', flexShrink: 0 }}>·</span>
          <div className="comment-input-wrap">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add a thought…"
              rows={2}
              disabled={posting}
            />
            <div className="comment-actions">
              <span className="mono small dim">Markdown ignored · Be kind, be brief</span>
              <button type="submit" disabled={!body.trim() || posting}>
                {posting ? '…' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <div className="empty-state small">
          <p className="serif" style={{ fontSize: 24, fontStyle: 'italic', margin: 0 }}>Quiet here.</p>
          <p className="mono small dim" style={{ marginTop: 6 }}>Be the first to comment.</p>
        </div>
      ) : (
        <ul className="comments-list">
          {comments.map(c => (
            <li key={c.id} className="comment">
              <span className="avatar small" style={{ background: 'var(--bg-card)', color: 'var(--ink)' }}>
                {c.authorName.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <div className="comment-head">
                  <strong>{c.authorName}</strong>
                  <span className="mono small dim">{relTime(c.createdAt)}</span>
                </div>
                <p className="comment-body">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

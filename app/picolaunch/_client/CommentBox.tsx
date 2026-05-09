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

const HUES = ['#e84e1b', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4']
function hueFromName(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return HUES[Math.abs(h) % HUES.length]
}

function Avatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }
  const initials =
    (name
      .split(/[\s.@]+/)
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('') || 'U').toUpperCase()
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hueFromName(name),
        color: '#fff',
        fontSize: Math.round(size * 0.38),
        fontFamily: 'var(--mono)',
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  )
}

export default function CommentBox({ slug, initialComments }: Props) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [me, setMe] = useState<{ avatar: string | null; name: string }>({
    avatar: null,
    name: 'You',
  })

  useEffect(() => {
    const softEmail = readSoftUserEmail()
    if (softEmail) {
      setMe({ avatar: null, name: softEmail.split('@')[0] || 'You' })
    }
    let supabase
    try {
      supabase = createBrowserClient()
    } catch {
      setAuthed(!!softEmail)
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (u) {
        const meta = u.user_metadata as
          | { avatar_url?: string; full_name?: string }
          | undefined
        setMe({
          avatar: meta?.avatar_url ?? null,
          name: meta?.full_name ?? u.email?.split('@')[0] ?? 'You',
        })
      }
      setAuthed(!!u || !!readSoftUserEmail())
    })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || posting) return

    if (authed === false) {
      router.push(`/login?next=/picolaunch/${encodeURIComponent(slug)}`)
      return
    }

    setPosting(true)
    try {
      const res = await fetch(
        `/api/champions/${encodeURIComponent(slug)}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed }),
        },
      )
      if (res.ok) {
        const json = await res.json()
        const c = json.comment
        if (c) {
          setComments(prev => [
            {
              id: c.id,
              body: c.body,
              createdAt: c.createdAt ?? Date.now(),
              authorName: c.author?.name ?? me.name,
              authorAvatar: c.author?.avatar ?? me.avatar,
            },
            ...prev,
          ])
        }
        setBody('')
      }
    } catch {
      /* silent */
    }
    setPosting(false)
  }

  return (
    <div className="comments-block">
      <h4>
        Discussion <span className="dim">· {comments.length}</span>
      </h4>

      {authed === false ? (
        <div className="comment-locked">
          <p>Sign in to leave a comment. Reading is free for everyone.</p>
          <a
            className="ghost-btn"
            href={`/login?next=/picolaunch/${encodeURIComponent(slug)}`}
          >
            Sign in to comment
          </a>
        </div>
      ) : (
        <form className="comment-form" onSubmit={submit}>
          <Avatar url={me.avatar} name={me.name} size={32} />
          <div className="comment-input-wrap">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add a thought…"
              rows={2}
              disabled={posting}
            />
            <div className="comment-actions">
              <span className="mono small dim">Be kind, be brief</span>
              <button type="submit" disabled={!body.trim() || posting}>
                {posting ? '…' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <div className="empty-state small">
          <p
            className="serif"
            style={{ fontSize: 24, fontStyle: 'italic', margin: 0 }}
          >
            Quiet here.
          </p>
          <p className="mono small dim" style={{ marginTop: 6 }}>
            Be the first to comment.
          </p>
        </div>
      ) : (
        <ul className="comment-list">
          {comments.map(c => (
            <li key={c.id} className="comment-item">
              <Avatar url={c.authorAvatar} name={c.authorName} size={32} />
              <div className="comment-body-wrap">
                <div className="comment-meta">
                  <b>{c.authorName}</b>
                  <span className="mono dim">{relTime(c.createdAt)}</span>
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

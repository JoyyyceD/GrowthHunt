'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface TweetCardData {
  id: string
  handle: string
  text: string
  url: string
  created_at_x: string
  like_count: number
  retweet_count: number
  view_count: number
  bookmark_count: number
  is_rt: boolean
  media_url: string | null
  author_name: string | null
  author_avatar: string | null
  author_followers: number | null
  is_blue_verified: boolean
  tags: string[]
  account: {
    handle: string
    display_label: string
    category: string
    account_type: string
    company: string
  } | null
  locked: boolean
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

const fmtDate = (s: string) => {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string))
}

function linkify(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)@(\w{1,15})/g, '$1<a href="https://x.com/$2" target="_blank" rel="noopener">@$2</a>')
}

export function TweetCard({ tweet, isAuthed }: { tweet: TweetCardData; isAuthed: boolean }) {
  const [copied, setCopied] = useState(false)
  const a = tweet
  const initials = (a.author_name || a.handle).slice(0, 1).toUpperCase()

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(tweet.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  if (tweet.locked) {
    return (
      <article className="xh-card xh-card-locked">
        <div className="xh-locked-inner">
          <div className="xh-locked-eyebrow">Sign in to unlock</div>
          <p className="xh-locked-text">{(tweet.text || '').slice(0, 60)}…</p>
          <Link href="/login" className="xh-locked-cta">
            Sign in (free) →
          </Link>
        </div>
        <style dangerouslySetInnerHTML={{ __html: cardStyles }} />
      </article>
    )
  }

  return (
    <article className="xh-card">
      <div className="xh-card-head">
        {a.author_avatar ? (
          <img src={a.author_avatar} className="xh-avatar" loading="lazy" alt="" />
        ) : (
          <div className="xh-avatar-fb">{initials}</div>
        )}
        <div className="xh-who">
          <div className="xh-name">
            {a.author_name || a.handle}
            {a.is_blue_verified && <span className="xh-verified">✓</span>}
          </div>
          <div className="xh-meta-line">
            @{a.handle} · {fmtDate(a.created_at_x)}
            {a.author_followers ? ` · ${fmt(a.author_followers)} followers` : ''}
          </div>
          {a.account?.display_label && (
            <div className="xh-account-label">{a.account.display_label}</div>
          )}
        </div>
        <a href={a.url} target="_blank" rel="noopener" className="xh-open" title="Open on X">↗</a>
      </div>

      {a.tags && a.tags.length > 0 && (
        <div className="xh-tags">
          {a.tags.map(t => (
            <span key={t} className={`xh-tag xh-tag-${t}`}>{t}</span>
          ))}
        </div>
      )}

      {a.is_rt && <div className="xh-rt">↻ Retweeted</div>}

      <div
        className="xh-text"
        dangerouslySetInnerHTML={{ __html: linkify(a.text) }}
      />

      {a.media_url && (
        <a href={a.url} target="_blank" rel="noopener">
          <img src={a.media_url} className="xh-media" loading="lazy" alt="" />
        </a>
      )}

      <div className="xh-foot">
        <span className="xh-stat">♡ {fmt(a.like_count)}</span>
        <span className="xh-stat">↻ {fmt(a.retweet_count)}</span>
        <span className="xh-stat">👁 {fmt(a.view_count)}</span>
        {a.bookmark_count > 0 && <span className="xh-stat">🔖 {fmt(a.bookmark_count)}</span>}
        <button
          className={`xh-copy${copied ? ' xh-copy-done' : ''}`}
          onClick={copyText}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: cardStyles }} />
    </article>
  )
}

const cardStyles = `
.xh-card {
  background: var(--bg-elev);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 20px 22px;
  margin-bottom: 20px;
  break-inside: avoid;
  display: block;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.xh-card:hover {
  border-color: var(--rule-strong);
  box-shadow: 0 8px 24px rgba(20,17,13,0.04);
}

.xh-card-locked {
  background: var(--bg-card);
  position: relative;
  min-height: 180px;
}
.xh-locked-inner {
  text-align: center;
  padding: 24px 8px;
  filter: blur(0);
}
.xh-locked-eyebrow {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 14px;
}
.xh-locked-text {
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.4;
  color: var(--ink-faint);
  filter: blur(3px);
  margin-bottom: 18px;
}
.xh-locked-cta {
  display: inline-block;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  padding: 9px 20px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
}

.xh-card-head {
  display: flex; align-items: flex-start; gap: 12px;
  margin-bottom: 14px;
}
.xh-avatar, .xh-avatar-fb {
  width: 36px; height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}
.xh-avatar {
  object-fit: cover;
  background: var(--bg-card);
  border: 1px solid var(--rule);
}
.xh-avatar-fb {
  display: flex; align-items: center; justify-content: center;
  font-family: var(--serif);
  font-size: 15px;
  color: var(--accent-ink);
  background: var(--accent);
}
.xh-who { flex: 1; min-width: 0; }
.xh-name {
  font-family: var(--serif);
  font-size: 17px;
  letter-spacing: -0.01em;
  display: flex; align-items: center; gap: 6px;
}
.xh-verified { color: var(--accent); font-size: 13px; }
.xh-meta-line {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-faint);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 2px;
}
.xh-account-label {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--accent);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.xh-open { color: var(--ink-faint); flex-shrink: 0; transition: color 0.15s; font-size: 14px; }
.xh-open:hover { color: var(--accent); }

.xh-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.xh-tag {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: var(--bg-card);
  color: var(--ink-dim);
}
.xh-tag-viral             { background: var(--accent); color: var(--accent-ink); }
.xh-tag-launch            { background: var(--accent-soft); color: var(--accent); }
.xh-tag-metric            { background: #e8f4fd; color: #0a66c2; }
.xh-tag-thread            { background: #f0ece2; color: #8a7a3f; }
.xh-tag-low-key-demo      { background: #eef7ec; color: #2f7a26; }
.xh-tag-engagement        { background: #fdf3e3; color: #a86f0c; }
.xh-tag-meme              { background: #f9e9f0; color: #b03a7a; }
.xh-tag-behind-the-scenes { background: #ece9f7; color: #553fb0; }

.xh-rt {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 10px;
}

.xh-text {
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 14px;
}
.xh-text a { color: var(--accent); }
.xh-media {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--rule);
  margin-bottom: 14px;
  display: block;
}

.xh-foot {
  display: flex; align-items: center; gap: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--rule);
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-faint);
  letter-spacing: 0.02em;
}
.xh-stat { display: inline-flex; align-items: center; gap: 5px; }
.xh-copy {
  margin-left: auto;
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  color: var(--ink);
  background: var(--bg-elev);
  cursor: pointer;
  transition: all 0.15s;
}
.xh-copy:hover { border-color: var(--ink); }
.xh-copy-done {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}
`

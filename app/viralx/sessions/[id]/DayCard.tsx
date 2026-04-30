'use client'

import { useState } from 'react'
import type { DayPlan } from '../../calendar'
import type { Exemplar } from '@/lib/viralx/exemplars'

interface StoredDay {
  day_number: number
  archetype: string
  content_text: string | null
  scheduled_at: string | null
  posted_at: string | null
  x_post_id: string | null
}

interface Props {
  sessionId: string
  plan: DayPlan
  stored: StoredDay | null
  exemplars: Exemplar[]
  hasCredentials: boolean
}

type Status = 'idea' | 'drafted' | 'scheduled' | 'posted'

export default function DayCard({ sessionId, plan, stored, exemplars, hasCredentials }: Props) {
  const [archetype, setArchetype] = useState<string>(stored?.archetype || plan.archetype)
  const [content, setContent] = useState<string>(stored?.content_text || '')
  const [postedId, setPostedId] = useState<string | null>(stored?.x_post_id ?? null)
  const [busy, setBusy] = useState<'gen' | 'save' | 'post' | null>(null)
  const [error, setError] = useState('')

  const status: Status = postedId ? 'posted' : stored?.scheduled_at ? 'scheduled' : content ? 'drafted' : 'idea'

  async function generate() {
    setBusy('gen')
    setError('')
    try {
      const res = await fetch('/api/viralx/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, day_number: plan.day, archetype }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setContent(data.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit() {
    setBusy('save')
    setError('')
    try {
      const res = await fetch('/api/viralx/days', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, day_number: plan.day, archetype, content_text: content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  async function postToX() {
    if (!confirm(`Post this tweet to X right now?\n\n${content}`)) return
    setBusy('post')
    setError('')
    try {
      // Save latest text + capture day_id from the upsert response
      const saveRes = await fetch('/api/viralx/days', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, day_number: plan.day, archetype, content_text: content }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok || !saveData.day_id) throw new Error(saveData.error || 'could not resolve day_id')

      const res = await fetch('/api/viralx/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_id: saveData.day_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setPostedId(data.x_post_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <article
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--rule)',
        borderRadius: 16,
        padding: 20,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          Day {String(plan.day).padStart(2, '0')}
        </span>
        <span
          style={{
            fontSize: 10, fontFamily: 'var(--mono)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--ink-dim)', background: 'var(--bg-card)',
            border: '1px solid var(--rule)', borderRadius: 999, padding: '3px 10px',
          }}
        >{archetype}</span>
      </div>

      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.2, margin: 0 }}>{plan.title}</h2>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{plan.hint}</p>

      {/* Draft area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value.slice(0, 280))}
          onBlur={() => content && content !== stored?.content_text && saveEdit()}
          placeholder={status === 'idea' ? 'Click Generate to draft this with MiniMax →' : ''}
          rows={4}
          disabled={busy !== null || !!postedId}
          style={{
            width: '100%', padding: '10px 12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--rule-strong)',
            borderRadius: 10,
            fontSize: 13, lineHeight: 1.5, color: 'var(--ink)',
            fontFamily: 'inherit', resize: 'vertical', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
            {content.length}/280
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={generate}
              disabled={busy !== null || !!postedId}
              style={pillBtn(false)}
            >
              {busy === 'gen' ? 'Generating…' : content ? 'Regenerate' : 'Generate'}
            </button>
            <button
              type="button"
              onClick={postToX}
              disabled={busy !== null || !!postedId || !content || !hasCredentials}
              title={!hasCredentials ? 'Add X credentials at /viralx/credentials first' : ''}
              style={pillBtn(true, !content || !hasCredentials)}
            >
              {postedId ? 'Posted ✓' : busy === 'post' ? 'Posting…' : 'Post to X'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>{error}</p>
      )}

      {/* Exemplars */}
      {exemplars.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
            Studied from {exemplars.length} real tweet{exemplars.length === 1 ? '' : 's'}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {exemplars.map(ex => (
              <a key={ex.id} href={ex.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '8px 10px',
                  background: 'var(--bg-card)', border: '1px solid var(--rule)',
                  borderRadius: 8, textDecoration: 'none', color: 'inherit',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>@{ex.handle}</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>♥ {fmt(ex.like_count)}</span>
                </div>
                <p style={{ fontSize: 11, lineHeight: 1.4, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {ex.text.length > 160 ? ex.text.slice(0, 160) + '…' : ex.text}
                </p>
              </a>
            ))}
          </div>
        </details>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--rule)' }}>
        <StatusDot status={status} />
        {postedId && (
          <a
            href={`https://x.com/i/web/status/${postedId}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-dim)', textDecoration: 'underline' }}
          >
            view on X →
          </a>
        )}
      </div>
    </article>
  )
}

function pillBtn(primary: boolean, disabled = false): React.CSSProperties {
  return {
    fontSize: 12, fontFamily: 'var(--mono)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    padding: '8px 14px', borderRadius: 999,
    border: primary ? 'none' : '1px solid var(--rule-strong)',
    background: primary ? (disabled ? 'var(--bg-card)' : 'var(--accent)') : 'var(--bg-card)',
    color: primary ? (disabled ? 'var(--ink-faint)' : 'var(--accent-ink)') : 'var(--ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
  }
}

function fmt(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n)
}

function StatusDot({ status }: { status: Status }) {
  const colorMap: Record<Status, string> = {
    idea: 'var(--ink-faint)',
    drafted: 'var(--accent)',
    scheduled: '#eab308',
    posted: '#22c55e',
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colorMap[status] }} />
      {status}
    </span>
  )
}
